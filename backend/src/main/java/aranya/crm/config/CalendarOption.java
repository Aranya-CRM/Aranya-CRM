package aranya.crm.config;

/** 一个可读写的 Google 日历(供前端选择写入目标 + 标识来源)。 */
public record CalendarOption(String id, String name, boolean isDefault) {
}
