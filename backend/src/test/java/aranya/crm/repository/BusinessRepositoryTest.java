package aranya.crm.repository;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.JpaRepository;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class BusinessRepositoryTest {

    @Test
    @DisplayName("Core business repositories extend Spring Data JPA")
    void coreBusinessRepositories_extendSpringDataJpa() {
        assertThat(JpaRepository.class).isAssignableFrom(ClientRepository.class);
        assertThat(JpaRepository.class).isAssignableFrom(RelatedContactRepository.class);
    }

    @Test
    @DisplayName("ClientRepository exposes lookup methods needed by client workflows")
    void clientRepository_exposesClientLookupMethods() throws Exception {
        assertMethod(ClientRepository.class, "findByAbbr", Optional.class, String.class);
        assertMethod(ClientRepository.class, "existsByAbbr", boolean.class, String.class);
        assertMethod(ClientRepository.class, "findAllByOrderByCreatedAtDesc", List.class);
        assertMethod(ClientRepository.class, "findByMembershipStatusIgnoreCaseOrderByCreatedAtDesc", List.class, String.class);
        assertMethod(ClientRepository.class, "searchClients", List.class, String.class, String.class);
        assertMethod(ClientRepository.class, "searchClients", List.class, String.class);
    }

    @Test
    @DisplayName("RelatedContactRepository exposes client-scoped contact methods")
    void relatedContactRepository_exposesClientScopedMethods() throws Exception {
        assertMethod(RelatedContactRepository.class, "findByClientIdOrderByPrimaryDescCreatedAtAsc", List.class, Long.class);
        assertMethod(RelatedContactRepository.class, "deleteByClientId", int.class, Long.class);
    }

    private static void assertMethod(
            Class<?> repositoryClass,
            String methodName,
            Class<?> returnType,
            Class<?>... parameterTypes
    ) throws Exception {
        Method method = repositoryClass.getMethod(methodName, parameterTypes);

        assertThat(method.getReturnType()).isEqualTo(returnType);
    }
}
