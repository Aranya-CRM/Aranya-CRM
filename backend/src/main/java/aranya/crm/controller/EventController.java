package aranya.crm.controller;

import aranya.crm.dto.response.ServiceEventResponse;
import aranya.crm.entity.User;
import aranya.crm.security.CapPermissionEvaluator;
import aranya.crm.security.annotation.CurrentUser;
import aranya.crm.service.CaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class EventController {

    private final CaseService caseService;
    private final CapPermissionEvaluator capEval;

    @GetMapping
    public ResponseEntity<List<ServiceEventResponse>> listEvents(
            @CurrentUser User currentUser,
            Authentication authentication,
            @RequestParam(defaultValue = "mine") String scope
    ) {
        if (hasRole(authentication, "ADMIN")) {
            throw new org.springframework.security.access.AccessDeniedException("Admin does not use event module");
        }
        if ("all".equalsIgnoreCase(scope)) {
            if (!canViewAllEvents(authentication)) {
                throw new org.springframework.security.access.AccessDeniedException("Cannot view all events");
            }
            return ResponseEntity.ok(caseService.listAllServiceEvents());
        }
        if ("created".equalsIgnoreCase(scope)) {
            if (!canCreateEvents(authentication)) {
                throw new org.springframework.security.access.AccessDeniedException("Cannot view created events");
            }
            return ResponseEntity.ok(caseService.listCreatedServiceEvents(currentUser.getId()));
        }
        return ResponseEntity.ok(caseService.listAssignedServiceEvents(currentUser.getId()));
    }

    private boolean canViewAllEvents(Authentication authentication) {
        if (hasRole(authentication, "ADMIN")) {
            return false;
        }
        return "ALL".equals(capEval.capScope(authentication, "reports:view"));
    }

    private boolean canCreateEvents(Authentication authentication) {
        return !"NO".equals(capEval.capScope(authentication, "cases:services.create"));
    }

    private boolean hasRole(Authentication authentication, String role) {
        if (authentication == null) {
            return false;
        }
        String authority = "ROLE_" + role;
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority::equals);
    }
}
