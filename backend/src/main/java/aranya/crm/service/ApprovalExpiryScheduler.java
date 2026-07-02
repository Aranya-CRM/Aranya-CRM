package aranya.crm.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 定时把「已过时限仍未决」的审批申请置为 EXPIRED。
 * 目前仅 CASE_CREATE(转为个案/创建个案)设了 30 天时限,超时自动过期,保证审批必在期限内有结果。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ApprovalExpiryScheduler {

    private final ApprovalService approvalService;

    /** 每天 02:00(新加坡时间)扫描一次;决策前另有兜底校验,故每日一次足够。 */
    @Scheduled(cron = "0 0 2 * * *", zone = "Asia/Singapore")
    public void expireOverdueApprovals() {
        int expired = approvalService.expireOverdue();
        if (expired > 0) {
            log.info("Expired {} overdue approval request(s)", expired);
        }
    }
}
