package aranya.crm.controller;

import aranya.crm.config.CalendarOption;
import aranya.crm.config.GoogleCalendarProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 日历相关元数据(供前端选择写入目标日历)。 */
@RestController
@RequestMapping("/api/v1/calendar")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class CalendarController {

    private final GoogleCalendarProperties properties;

    /** 可写入的共享日历列表(含默认标记);集成未启用/未配置时返回空列表。 */
    @GetMapping("/options")
    public ResponseEntity<List<CalendarOption>> options() {
        if (!properties.isEnabled()) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(properties.resolveCalendars());
    }
}
