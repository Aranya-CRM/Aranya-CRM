package aranya.crm.service;

import aranya.crm.entity.User;
import aranya.crm.repository.UserRepository;
import aranya.crm.security.model.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException{

        User user = userRepository.findByEmailWithRoles(email)
                .orElseThrow(() -> {
                    log.warn("Login attempt with non-existent email");
                    return new UsernameNotFoundException("User not found");
                });

        List<String> roleNames = user.getUserRoles().stream()
                .map(userRole -> userRole.getRole().getName())
                .toList();

        return UserPrincipal.of(user, roleNames);
    }
}
