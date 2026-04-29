package aranya.crm.security.util;


import aranya.crm.config.AppProperties;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SecurityException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtUtil {

    public enum TokenType {
        ACCESS,
        REFRESH,
        TWO_FACTOR
    }

    private final AppProperties appProperties;

    private SecretKey signingKey;

    @PostConstruct
    public void init() {
        this.signingKey = Keys.hmacShaKeyFor(
                appProperties.getJwt().getSecret().getBytes()
        );
    }

    public String generateAccessToken(UserDetails userDetails) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("roles", extractRoleNames(userDetails));
        return buildToken(userDetails.getUsername(),
                appProperties.getJwt().getAccessTokenExpiration(), TokenType.ACCESS, extraClaims);
    }

    public String generateRefreshToken(UserDetails userDetails) {
        return buildToken(userDetails.getUsername(),
                appProperties.getJwt().getRefreshTokenExpiration(), TokenType.REFRESH, null);
    }

    public String generateTempToken(UserDetails userDetails) {
        return buildToken(userDetails.getUsername(),
                appProperties.getTwoFactor().getTempTokenExpiration(), TokenType.TWO_FACTOR, null);
    }

    /**
     * 把 UserDetails 的 GrantedAuthority 转成裸的 role name 列表（去掉 ROLE_ 前缀），用作 JWT 的 roles claim。
     */
    private List<String> extractRoleNames(UserDetails userDetails) {
        if (userDetails.getAuthorities() == null) {
            return Collections.emptyList();
        }
        return userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(a -> a.startsWith("ROLE_") ? a.substring("ROLE_".length()) : a)
                .toList();
    }

    /**
     * 从 access token 中读出 roles claim，返回去掉 ROLE_ 前缀的 role name 列表。
     */
    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        Object raw = extractClaims(token).get("roles");
        if (raw instanceof List<?> list) {
            return list.stream().map(Object::toString).toList();
        }
        return Collections.emptyList();
    }

    public String extractEmailFromTempToken(String token) {
        try {
            Claims claims = extractClaims(token);
            if (!TokenType.TWO_FACTOR.name().equals(claims.get("tokenType"))) {
                throw new BadCredentialsException("Invalid temp token type");
            }
            return claims.getSubject();
        } catch (JwtException e) {
            throw new BadCredentialsException("Invalid or expired temp token");
        }
    }


    private String buildToken(String subject, long expiration, TokenType tokenType, Map<String, Object> extraClaims){
        Map<String,Object> claims = new HashMap<>();
        claims.put("tokenType",tokenType.name());
        if (extraClaims != null) {
            claims.putAll(extraClaims);
        }
        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis()+expiration))
                .signWith(signingKey)
                .compact();
    }

    public String extractEmail(String token) {
        return extractClaims(token).getSubject();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try{
            Claims claims = extractClaims(token);
            String email = claims.getSubject();
            Date expiration = claims.getExpiration();
            return email.equals(userDetails.getUsername()) && expiration.after(new Date());
        }catch (JwtException e){
            return false;
        }
    }

    public boolean isRefreshToken(String token){
        Claims claims = extractClaims(token);
        return TokenType.REFRESH.name().equals(claims.get("tokenType"));
    }

    public boolean isAccessToken(String token) {
        Claims claims = extractClaims(token);
        return TokenType.ACCESS.name().equals(claims.get("tokenType"));
    }

    private boolean isTokenExpired(String token) {
        return extractClaims(token).getExpiration().before(new Date());
    }

    private Claims extractClaims(String token){
        try{
            return Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        }catch (ExpiredJwtException e){
            log.warn("JWT token expired: {}",e.getMessage());
            throw e;
        }catch (MalformedJwtException e){
            log.warn("JWT token malformed: {}",e.getMessage());
            throw e;
        }catch (SecurityException e){
            log.warn("JWT token not signed: {}",e.getMessage());
            throw e;
        }catch (JwtException e){
            log.warn("Invalid JWT token: {}",e.getMessage());
            throw e;
        }
    }

}
