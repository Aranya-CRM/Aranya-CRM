package aranya.crm.controller;

import aranya.crm.config.WebMvcConfig;
import aranya.crm.dto.response.CaseDocumentResponse;
import aranya.crm.dto.response.DocumentDownloadResponse;
import aranya.crm.entity.DocumentCategory;
import aranya.crm.entity.User;
import aranya.crm.security.CapPermissionEvaluator;
import aranya.crm.security.annotation.CurrentUserArgumentResolver;
import aranya.crm.service.CaseDocumentService;
import aranya.crm.service.GcsFileStorageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CaseDocumentController.class)
@Import({
        CaseDocumentControllerTest.TestSecurityConfig.class,
        WebMvcConfig.class,
        CurrentUserArgumentResolver.class
})
class CaseDocumentControllerTest {

    @TestConfiguration
    @EnableWebSecurity
    @EnableMethodSecurity
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http.csrf(AbstractHttpConfigurer::disable)
                    .authorizeHttpRequests(a -> a.anyRequest().permitAll());
            return http.build();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CaseDocumentService caseDocumentService;

    @MockitoBean
    private CapPermissionEvaluator capEval;

    @Test
    @DisplayName("listCaseDocuments returns active files for a case")
    void listCaseDocuments_returnsActiveFilesForCase() throws Exception {
        User requester = user(10L, "Social Worker");
        when(capEval.hasCap(any(), eq("cases:view"))).thenReturn(true);
        when(caseDocumentService.listCaseDocuments(7L)).thenReturn(List.of(response()));

        mockMvc.perform(get("/api/v1/cases/7/documents")
                        .with(authentication(auth(requester, "SOCIAL_WORKER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].documentId").value(99))
                .andExpect(jsonPath("$[0].category").value("MEDICAL"))
                .andExpect(jsonPath("$[0].fileName").value("Medical_Report.pdf"));
    }

    @Test
    @DisplayName("uploadCaseDocument requires upload capability and accepts multipart file")
    void uploadCaseDocument_requiresUploadCapabilityAndAcceptsMultipartFile() throws Exception {
        User requester = user(10L, "Social Worker");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "medical.pdf",
                "application/pdf",
                "pdf-bytes".getBytes()
        );
        when(capEval.hasCap(any(), eq("cases:view"))).thenReturn(true);
        when(capEval.hasCap(any(), eq("cases:documents.upload"))).thenReturn(true);
        when(caseDocumentService.uploadCaseDocument(eq(7L), eq(DocumentCategory.MEDICAL), any(), any(), eq(requester)))
                .thenReturn(response());

        mockMvc.perform(multipart("/api/v1/cases/7/documents")
                        .file(file)
                        .param("category", "MEDICAL")
                        .with(authentication(auth(requester, "SOCIAL_WORKER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentId").value(99))
                .andExpect(jsonPath("$.category").value("MEDICAL"));
    }

    @Test
    @DisplayName("uploadCaseDocument reports storage configuration failures")
    void uploadCaseDocument_reportsStorageConfigurationFailures() throws Exception {
        User requester = user(10L, "Social Worker");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "medical.pdf",
                "application/pdf",
                "pdf-bytes".getBytes()
        );
        when(capEval.hasCap(any(), eq("cases:view"))).thenReturn(true);
        when(capEval.hasCap(any(), eq("cases:documents.upload"))).thenReturn(true);
        when(caseDocumentService.uploadCaseDocument(eq(7L), eq(DocumentCategory.MEDICAL), any(), any(), eq(requester)))
                .thenThrow(new GcsFileStorageService.StorageNotConfiguredException("GCS bucket name is not configured"));

        mockMvc.perform(multipart("/api/v1/cases/7/documents")
                        .file(file)
                        .param("category", "MEDICAL")
                        .with(authentication(auth(requester, "SOCIAL_WORKER"))))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("FILE_STORAGE_UNAVAILABLE"))
                .andExpect(jsonPath("$.message").value("File storage is not configured."));
    }

    @Test
    @DisplayName("createDownloadUrl returns signed URL")
    void createDownloadUrl_returnsSignedUrl() throws Exception {
        User requester = user(10L, "Social Worker");
        when(capEval.hasCap(any(), eq("cases:view"))).thenReturn(true);
        when(caseDocumentService.createDownloadUrl(7L, 99L))
                .thenReturn(DocumentDownloadResponse.builder()
                        .url("https://signed.example.test/medical.pdf")
                        .fileName("Medical_Report.pdf")
                        .expiresInSeconds(600L)
                        .build());

        mockMvc.perform(get("/api/v1/cases/7/documents/99/download-url")
                        .with(authentication(auth(requester, "SOCIAL_WORKER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("https://signed.example.test/medical.pdf"))
                .andExpect(jsonPath("$.fileName").value("Medical_Report.pdf"));
    }

    @Test
    @DisplayName("deleteCaseDocument requires delete capability")
    void deleteCaseDocument_requiresDeleteCapability() throws Exception {
        User requester = user(1L, "Manager");
        when(capEval.hasCap(any(), eq("cases:view"))).thenReturn(true);
        when(capEval.hasCap(any(), eq("cases:documents.delete"))).thenReturn(true);

        mockMvc.perform(delete("/api/v1/cases/7/documents/99")
                        .with(authentication(auth(requester, "MANAGER"))))
                .andExpect(status().isNoContent());
    }

    private static CaseDocumentResponse response() {
        return CaseDocumentResponse.builder()
                .id(55L)
                .documentId(99L)
                .caseId(7L)
                .category(DocumentCategory.MEDICAL)
                .fileName("Medical_Report.pdf")
                .mimeType(MediaType.APPLICATION_PDF_VALUE)
                .fileSize(1024L)
                .uploadedByName("Social Worker")
                .uploadedAt(LocalDateTime.of(2026, 7, 1, 11, 0))
                .build();
    }

    private static UsernamePasswordAuthenticationToken auth(User user, String roleName) {
        return new UsernamePasswordAuthenticationToken(
                user,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + roleName))
        );
    }

    private static User user(Long id, String fullName) {
        User user = new User();
        user.setId(id);
        user.setUsername("user" + id);
        user.setEmail("user" + id + "@test.com");
        user.setFullName(fullName);
        user.setStatus("ACTIVE");
        return user;
    }
}
