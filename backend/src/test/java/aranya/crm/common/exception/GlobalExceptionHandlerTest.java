package aranya.crm.common.exception;

import aranya.crm.common.dto.ApiErrorResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    @Test
    @DisplayName("MaxUploadSizeExceededException maps to payload-too-large API error")
    void maxUploadSizeExceeded_mapsToPayloadTooLargeApiError() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/cases/7/documents");

        ResponseEntity<ApiErrorResponse> response = handler.handleMaxUploadSizeExceeded(
                new MaxUploadSizeExceededException(25L * 1024L * 1024L),
                request
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCode()).isEqualTo("FILE_TOO_LARGE");
        assertThat(response.getBody().getPath()).isEqualTo("/api/v1/cases/7/documents");
    }
}
