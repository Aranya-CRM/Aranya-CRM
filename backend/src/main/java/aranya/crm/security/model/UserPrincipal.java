package aranya.crm.security.model;

import aranya.crm.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

@Getter
public class UserPrincipal implements UserDetails {

    private final Long id;
    private final String email;
    private final String fullName;
    private final String passwordHash;
    private final String status;
    private final Collection<? extends GrantedAuthority> authorities;

    private UserPrincipal(User user, List<String> roleNames){
        this.id = user.getId();
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.passwordHash = user.getPasswordHash();
        this.status = user.getStatus();
        this.authorities=roleNames.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_"+role.toUpperCase()))
                .collect(Collectors.toList());
    }

    public static UserPrincipal of(User user, List<String> roleNames){
        return new UserPrincipal(user, roleNames);
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public boolean isEnabled() {
        return "ACTIVE".equals(status);
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
}
