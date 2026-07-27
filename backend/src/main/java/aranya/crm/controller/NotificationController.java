package aranya.crm.controller;

import aranya.crm.dto.response.EventNotificationResponse;
import aranya.crm.entity.User;
import aranya.crm.security.annotation.CurrentUser;
import aranya.crm.service.EventOverdueNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final EventOverdueNotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<EventNotificationResponse>> list(@CurrentUser User currentUser) {
        return ResponseEntity.ok(notificationService.listForUser(currentUser));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<EventNotificationResponse> markRead(
            @PathVariable Long id,
            @CurrentUser User currentUser
    ) {
        return ResponseEntity.ok(notificationService.markRead(id, currentUser));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Map<String, Integer>> markAllRead(@CurrentUser User currentUser) {
        return ResponseEntity.ok(Map.of("updated", notificationService.markAllRead(currentUser)));
    }
}
