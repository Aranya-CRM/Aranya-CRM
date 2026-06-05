package aranya.crm.controller;

import aranya.crm.dto.request.CreateClientRequest;
import aranya.crm.dto.request.UpdateClientRequest;
import aranya.crm.dto.response.ClientDetailResponse;
import aranya.crm.dto.response.ClientSummaryResponse;
import aranya.crm.entity.User;
import aranya.crm.security.annotation.CurrentUser;
import aranya.crm.service.ClientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
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

    @PostMapping
    @PreAuthorize("@capEval.hasCap(authentication, 'clients:create')")
    public ResponseEntity<ClientDetailResponse> createClient(
            @Valid @RequestBody CreateClientRequest req,
            @CurrentUser User currentUser
    ) {
        ClientDetailResponse created = clientService.createClient(req, currentUser);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("@capEval.hasCap(authentication, 'clients:update')")
    public ResponseEntity<ClientDetailResponse> updateClient(
            @PathVariable Long id,
            @Valid @RequestBody UpdateClientRequest req
    ) {
        return ResponseEntity.ok(clientService.updateClient(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@capEval.hasCap(authentication, 'clients:delete')")
    public ResponseEntity<Void> deleteClient(@PathVariable Long id) {
        clientService.deleteClient(id);
        return ResponseEntity.noContent().build();
    }
}
