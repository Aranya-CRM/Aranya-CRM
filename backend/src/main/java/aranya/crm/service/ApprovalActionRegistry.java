package aranya.crm.service;

import aranya.crm.dto.request.CreateCaseRequest;
import aranya.crm.entity.ApprovalRequest;
import aranya.crm.entity.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;

@Service
@RequiredArgsConstructor
public class ApprovalActionRegistry {

    private final CaseService caseService;
    private final ClientService clientService;
    private final ReportService reportService;
    private final ObjectMapper objectMapper;
    private static final String APPROVAL_META_FIELD = "_approval";

    public boolean supports(String type) {
        return handlers().containsKey(type);
    }

    public void execute(ApprovalRequest request, User decidedBy) {
        BiConsumer<ApprovalRequest, User> handler = handlers().get(request.getType());
        if (handler == null) {
            throw new IllegalArgumentException("Unsupported approval type: " + request.getType());
        }
        handler.accept(request, decidedBy);
    }

    private Map<String, BiConsumer<ApprovalRequest, User>> handlers() {
        return Map.of(
                "CASE_CREATE", this::executeCaseCreate,
                "CASE_SERVICE_UPDATE", this::executeCaseServiceUpdate,
                "CLIENT_CREATE", this::executeClientCreate,
                "CLIENT_UPDATE", this::executeClientUpdate,
                "DELETE_CLIENT", (request, _decidedBy) -> clientService.executeApprovedDeleteClient(request.getTargetId()),
                "DELETE_CASE", (request, decidedBy) -> caseService.executeApprovedDeleteCase(request.getTargetId(), decidedBy),
                "RESTORE_CLIENT", (request, _decidedBy) -> clientService.restoreClient(request.getTargetId()),
                "RESTORE_CASE", (request, decidedBy) -> caseService.restoreCase(request.getTargetId(), decidedBy),
                "DELETE_REPORT", (request, decidedBy) -> reportService.executeApprovedDeleteReport(request.getTargetId(), decidedBy)
        );
    }

    private void executeCaseCreate(ApprovalRequest request, User ignoredDecidedBy) {
        caseService.executeApprovedCreateCase(
                objectMapper.convertValue(actionPayload(request), CreateCaseRequest.class),
                request.getRequestedBy()
        );
    }

    private void executeCaseServiceUpdate(ApprovalRequest request, User decidedBy) {
        caseService.executeApprovedUpdateCaseServices(
                request.getTargetId(),
                objectMapper.convertValue(
                        request.getPayloadJson().path("serviceKeys"),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)
                ),
                decidedBy
        );
    }

    private void executeClientCreate(ApprovalRequest request, User ignoredDecidedBy) {
        clientService.executeApprovedCreateClient(
                objectMapper.convertValue(actionPayload(request), aranya.crm.dto.request.CreateClientRequest.class),
                request.getRequestedBy()
        );
    }

    private void executeClientUpdate(ApprovalRequest request, User ignoredDecidedBy) {
        clientService.executeApprovedUpdateClient(
                request.getTargetId(),
                objectMapper.convertValue(actionPayload(request), aranya.crm.dto.request.UpdateClientRequest.class)
        );
    }

    private JsonNode actionPayload(ApprovalRequest request) {
        JsonNode payload = request.getPayloadJson();
        if (payload == null || !payload.isObject() || !payload.has(APPROVAL_META_FIELD)) {
            return payload;
        }
        ObjectNode copy = payload.deepCopy();
        copy.remove(APPROVAL_META_FIELD);
        return copy;
    }
}
