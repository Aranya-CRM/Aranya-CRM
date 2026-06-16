package aranya.crm.service;

import aranya.crm.dto.request.CreateCaseRequest;
import aranya.crm.dto.request.CreateServiceEventRequest;
import aranya.crm.entity.ApprovalRequest;
import aranya.crm.entity.User;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final CaseNoteService caseNoteService;
    private final UserService userService;
    private final ObjectMapper objectMapper;

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
                "SERVICE_EVENT_CREATE", this::executeServiceEventCreate,
                "DELETE_CLIENT", (request, _decidedBy) -> clientService.executeApprovedDeleteClient(request.getTargetId()),
                "DELETE_REPORT", (request, decidedBy) -> reportService.executeApprovedDeleteReport(request.getTargetId(), decidedBy),
                "DELETE_CASE_NOTE", (request, decidedBy) -> caseNoteService.executeApprovedDeleteCaseNote(request.getTargetId(), decidedBy),
                "DELETE_USER", (request, _decidedBy) -> userService.executeApprovedDeleteUser(request.getTargetId())
        );
    }

    private void executeCaseCreate(ApprovalRequest request, User ignoredDecidedBy) {
        caseService.executeApprovedCreateCase(
                objectMapper.convertValue(request.getPayloadJson(), CreateCaseRequest.class),
                request.getRequestedBy()
        );
    }

    private void executeCaseServiceUpdate(ApprovalRequest request, User ignoredDecidedBy) {
        caseService.executeApprovedUpdateCaseServices(
                request.getTargetId(),
                objectMapper.convertValue(
                        request.getPayloadJson().path("serviceKeys"),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)
                )
        );
    }

    private void executeServiceEventCreate(ApprovalRequest request, User ignoredDecidedBy) {
        caseService.executeApprovedCreateServiceEvent(
                request.getTargetId(),
                objectMapper.convertValue(request.getPayloadJson().path("serviceEvent"), CreateServiceEventRequest.class),
                request.getRequestedBy()
        );
    }
}
