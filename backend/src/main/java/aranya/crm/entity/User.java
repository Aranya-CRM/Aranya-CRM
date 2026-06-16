package aranya.crm.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "users") // 避免和 PostgreSQL 保留字 user 冲突
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "firebase_uid",nullable = false,unique = true,length = 128)
    private String firebaseUid;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "email_verified",nullable = false)
    private boolean emailVerified;

    @Column(length = 20)
    private String phone;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "invited_at")
    private OffsetDateTime invitedAt; // 仅 INVITED 用户写入,用于超期未接受邀请的提醒

    @CreationTimestamp
    @Column(name="created_at",nullable = false,updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name="updated_at",nullable = false)
    private OffsetDateTime updatedAt;



    // 一个用户对应多个 user_role 记录
    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<UserRole> userRoles = new ArrayList<>();

}
