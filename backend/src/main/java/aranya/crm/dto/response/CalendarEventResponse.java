package aranya.crm.dto.response;

import lombok.Builder;
import lombok.Getter;

/**
 * 从 Google 共享日历读回的事件(用于在 case 日历视图中作为背景/上下文展示)。
 * source:
 *  - OTHER_CASE  其他 case 写入的事件(带 caseId 扩展属性)
 *  - EXTERNAL    日历上人工/其他来源的事件(无 caseId)
 */
@Getter
@Builder
public class CalendarEventResponse {
    private String id;
    private String title;
    private String start;   // ISO-8601 字符串(含时区)
    private String end;     // ISO-8601 字符串(含时区),可空
    private boolean allDay;
    private String source;  // OTHER_CASE | EXTERNAL
    private Long caseId;    // 关联的 case(若有)
    private String location;
    private String description; // Google 事件正文(模板分节原文)
    private String calendarId;   // 事件所属日历 id
    private String calendarName; // 事件所属日历显示名
    private String colorId;      // Google 事件调色板 id("1"-"11");未单独设色时为空,表示继承日历默认色
}
