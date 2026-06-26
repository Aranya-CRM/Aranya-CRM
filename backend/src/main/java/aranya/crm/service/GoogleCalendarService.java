package aranya.crm.service;

import aranya.crm.config.CalendarOption;
import aranya.crm.config.GoogleCalendarProperties;
import aranya.crm.dto.response.CalendarEventResponse;
import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.Events;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Google 共享日历同步服务(本地表为真相源,此处做 best-effort 镜像)。
 * 所有方法在集成关闭/凭证缺失/调用失败时安全降级,绝不阻断本地业务。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleCalendarService {

    private static final String CASE_ID_PROP = "aranyaCaseId";
    private static final String SERVICE_KEY_PROP = "aranyaServiceKey";

    private final ObjectProvider<Calendar> calendarProvider;
    private final GoogleCalendarProperties properties;

    private Calendar client() {
        if (!properties.isEnabled()) {
            return null;
        }
        return calendarProvider.getIfAvailable();
    }

    /** 解析实际写入的日历 id:请求的合法则用之,否则用默认日历。 */
    public String resolveTargetCalendarId(String requested) {
        if (requested != null && properties.isKnownCalendar(requested)) {
            return requested;
        }
        return properties.resolveDefaultCalendarId();
    }

    /**
     * 将一个 case 服务事件镜像写入指定日历。
     * @param targetCalendarId 目标日历 id(为空则用默认日历)
     * @return Google 事件 ID;集成未启用或失败时返回空。
     */
    public Optional<String> createCaseEvent(Long caseId, String serviceKey, String title, String description,
                                            String location, LocalDateTime start, LocalDateTime end,
                                            String targetCalendarId) {
        Calendar calendar = client();
        if (calendar == null || start == null) {
            return Optional.empty();
        }
        String calId = (targetCalendarId != null && properties.isKnownCalendar(targetCalendarId))
                ? targetCalendarId
                : properties.resolveDefaultCalendarId();
        if (calId == null) {
            return Optional.empty();
        }
        try {
            ZoneId zone = ZoneId.of(properties.getTimeZone());
            LocalDateTime effectiveEnd = end != null ? end
                    : start.plusMinutes(properties.getDefaultDurationMinutes());

            Event event = new Event()
                    .setSummary(title)
                    .setDescription(description)
                    .setLocation(location)
                    .setColorId(properties.getEventColorId())
                    .setStart(toEventDateTime(start, zone))
                    .setEnd(toEventDateTime(effectiveEnd, zone));

            Event.ExtendedProperties ext = new Event.ExtendedProperties();
            ext.setShared(Map.of(
                    CASE_ID_PROP, String.valueOf(caseId),
                    SERVICE_KEY_PROP, serviceKey == null ? "" : serviceKey));
            event.setExtendedProperties(ext);

            Event created = calendar.events().insert(calId, event).execute();
            log.info("Mirrored case {} event to Google calendar {}, eventId={}", caseId, calId, created.getId());
            return Optional.ofNullable(created.getId());
        } catch (Exception e) {
            log.warn("Failed to mirror case {} event to Google calendar (continuing): {}", caseId, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * 更新指定日历上已镜像的事件(标题/时间/正文等)。
     * @return 成功时返回 Google 事件 ID;集成未启用或失败时返回空。
     */
    public Optional<String> updateCaseEvent(String calendarId, String googleEventId, Long caseId, String serviceKey,
                                            String title, String description, String location,
                                            LocalDateTime start, LocalDateTime end) {
        Calendar calendar = client();
        if (calendar == null || googleEventId == null || googleEventId.isBlank() || start == null) {
            return Optional.empty();
        }
        String calId = (calendarId != null && properties.isKnownCalendar(calendarId))
                ? calendarId
                : properties.resolveDefaultCalendarId();
        if (calId == null) {
            return Optional.empty();
        }
        try {
            ZoneId zone = ZoneId.of(properties.getTimeZone());
            LocalDateTime effectiveEnd = end != null ? end
                    : start.plusMinutes(properties.getDefaultDurationMinutes());

            Event event = new Event()
                    .setSummary(title)
                    .setDescription(description)
                    .setLocation(location)
                    .setColorId(properties.getEventColorId())
                    .setStart(toEventDateTime(start, zone))
                    .setEnd(toEventDateTime(effectiveEnd, zone));

            Event.ExtendedProperties ext = new Event.ExtendedProperties();
            ext.setShared(Map.of(
                    CASE_ID_PROP, String.valueOf(caseId),
                    SERVICE_KEY_PROP, serviceKey == null ? "" : serviceKey));
            event.setExtendedProperties(ext);

            Event updated = calendar.events().update(calId, googleEventId, event).execute();
            log.info("Updated Google calendar event {} on {}", googleEventId, calId);
            return Optional.ofNullable(updated.getId());
        } catch (Exception e) {
            log.warn("Failed to update Google calendar event {} on {} (continuing): {}", googleEventId, calId, e.getMessage());
            return Optional.empty();
        }
    }

    /** 从指定日历删除已镜像的事件;404/410 视为已删除,其它失败记录为潜在孤儿以便人工清理。 */
    public void deleteCaseEvent(String calendarId, String googleEventId) {
        Calendar calendar = client();
        if (calendar == null || googleEventId == null || googleEventId.isBlank()) {
            return;
        }
        String calId = (calendarId != null && !calendarId.isBlank())
                ? calendarId
                : properties.resolveDefaultCalendarId();
        if (calId == null) {
            return;
        }
        try {
            calendar.events().delete(calId, googleEventId).execute();
            log.info("Deleted Google calendar event {} from {}", googleEventId, calId);
        } catch (GoogleJsonResponseException e) {
            int code = e.getStatusCode();
            if (code == 404 || code == 410) {
                log.info("Google calendar event {} already absent on {} (treated as deleted)", googleEventId, calId);
            } else {
                log.warn("Failed to delete Google calendar event {} on {} (possible orphan, manual cleanup): {}",
                        googleEventId, calId, e.getMessage());
            }
        } catch (Exception e) {
            log.warn("Failed to delete Google calendar event {} on {} (possible orphan, manual cleanup): {}",
                    googleEventId, calId, e.getMessage());
        }
    }

    /**
     * 读取所有已配置共享日历在 [from, to] 区间内的事件并合并,排除当前 case 自己的事件
     * (那些由本地真相源渲染,避免重复)。集成未启用/失败时返回空列表。
     */
    public List<CalendarEventResponse> listEvents(LocalDateTime from, LocalDateTime to, Long excludeCaseId) {
        Calendar calendar = client();
        if (calendar == null || from == null || to == null) {
            return List.of();
        }
        ZoneId zone = ZoneId.of(properties.getTimeZone());
        DateTime timeMin = new DateTime(Date.from(from.atZone(zone).toInstant()));
        DateTime timeMax = new DateTime(Date.from(to.atZone(zone).toInstant()));
        List<CalendarEventResponse> result = new ArrayList<>();
        for (CalendarOption cal : properties.resolveCalendars()) {
            try {
                Events events = calendar.events().list(cal.id())
                        .setTimeMin(timeMin)
                        .setTimeMax(timeMax)
                        .setSingleEvents(true)
                        .setOrderBy("startTime")
                        .execute();
                for (Event event : events.getItems()) {
                    Long caseId = extractCaseId(event);
                    if (excludeCaseId != null && excludeCaseId.equals(caseId)) {
                        continue; // 本地已渲染该 case 自己的事件
                    }
                    result.add(CalendarEventResponse.builder()
                            .id(event.getId())
                            .title(event.getSummary())
                            .start(extractDateTime(event.getStart()))
                            .end(extractDateTime(event.getEnd()))
                            .allDay(event.getStart() != null && event.getStart().getDate() != null)
                            .source(caseId != null ? "OTHER_CASE" : "EXTERNAL")
                            .caseId(caseId)
                            .location(event.getLocation())
                            .description(event.getDescription())
                            .calendarId(cal.id())
                            .calendarName(cal.name())
                            .build());
                }
            } catch (Exception e) {
                log.warn("Failed to read Google calendar {} (skipping): {}", cal.id(), e.getMessage());
            }
        }
        return result;
    }

    private EventDateTime toEventDateTime(LocalDateTime dateTime, ZoneId zone) {
        return new EventDateTime()
                .setDateTime(new DateTime(Date.from(dateTime.atZone(zone).toInstant())))
                .setTimeZone(properties.getTimeZone());
    }

    private Long extractCaseId(Event event) {
        if (event.getExtendedProperties() == null || event.getExtendedProperties().getShared() == null) {
            return null;
        }
        String raw = event.getExtendedProperties().getShared().get(CASE_ID_PROP);
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(raw);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String extractDateTime(EventDateTime edt) {
        if (edt == null) {
            return null;
        }
        if (edt.getDateTime() != null) {
            return edt.getDateTime().toStringRfc3339();
        }
        if (edt.getDate() != null) {
            return edt.getDate().toStringRfc3339();
        }
        return null;
    }
}
