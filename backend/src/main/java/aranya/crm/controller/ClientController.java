package aranya.crm.controller;

import aranya.crm.dto.response.ClientDetailResponse;
import aranya.crm.dto.response.ClientSummaryResponse;
import aranya.crm.service.ClientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/clients")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ClientController {

    private final ClientService clientService;

    @GetMapping
    public ResponseEntity<List<ClientSummaryResponse>> listClients(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String membershipStatus
    ) {
        return ResponseEntity.ok(clientService.listClients(q, membershipStatus));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClientDetailResponse> getClientDetail(@PathVariable Long id) {
        return ResponseEntity.ok(clientService.getClientDetail(id));
    }
}
