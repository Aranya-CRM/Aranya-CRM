package aranya.crm.controller;

import aranya.crm.dto.response.ServiceEventResponse;
import aranya.crm.entity.User;
import aranya.crm.security.annotation.CurrentUser;
import aranya.crm.service.CaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class TaskController {

    private final CaseService caseService;

    @GetMapping
    public ResponseEntity<List<ServiceEventResponse>> listAssignedTasks(@CurrentUser User currentUser) {
        return ResponseEntity.ok(caseService.listAssignedServiceEvents(currentUser.getId()));
    }
}
