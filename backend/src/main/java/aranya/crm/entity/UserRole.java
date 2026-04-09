package aranya.crm.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(
        name = "user_role",
        // 联合唯一约束，同一个用户不能重复分配同一个角色
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "role_id"})
)
public class UserRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 多个 user_role 属于同一个 user
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 多个 user_role 属于同一个 role
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Column(name = "assigned_at", nullable = false, updatable = false)
    private LocalDateTime assignedAt;

    // 记录是谁分配的，用 id 存储避免循环依赖
    @Column(name = "assigned_by")
    private Long assignedBy;

    @PrePersist
    protected void onCreate() {
        this.assignedAt = LocalDateTime.now();
    }
}