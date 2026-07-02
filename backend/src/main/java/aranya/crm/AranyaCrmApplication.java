package aranya.crm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@SpringBootApplication
@EnableScheduling
public class AranyaCrmApplication {
    public static void main(String[] args) {
        SpringApplication.run(AranyaCrmApplication.class, args);
    }
}