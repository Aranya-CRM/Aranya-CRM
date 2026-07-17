package aranya.crm.entity;

import aranya.crm.dto.response.ClientDetailResponse;

import java.util.function.Predicate;

/**
 * Sensitive sections of a client profile, each guarded by a grantable {@code clients:profile.*}
 * capability. Used to mask {@link ClientDetailResponse} fields the requester is not allowed to view.
 *
 * Basic contact info is never masked; only the detailed/sensitive sections below are.
 */
public enum ClientProfileSection {

    IDENTITY("clients:profile.identity") {
        @Override
        public void clear(ClientDetailResponse r) {
            r.setNricNameEn(null);
            r.setNricNameChn(null);
            r.setNricNo(null);
            r.setOrdinationCertificateStatus(null);
            r.setDateOfVerification(null);
        }
    },
    PERSONAL("clients:profile.personal") {
        @Override
        public void clear(ClientDetailResponse r) {
            r.setGender(null);
            r.setDateOfBirth(null);
            r.setMaritalStatus(null);
            r.setNationality(null);
            r.setEthnicity(null);
            r.setDialectGroup(null);
            r.setNextOfKinContact(null);
        }
    },
    ORDINATION("clients:profile.ordination") {
        @Override
        public void clear(ClientDetailResponse r) {
            r.setBuddhistTradition(null);
            r.setOrdinationStatus(null);
            r.setDateOfTonsure(null);
            r.setCountryOfTonsure(null);
            r.setPlaceOfTonsure(null);
            r.setDateOfOrdination(null);
            r.setCountryOfOrdination(null);
            r.setPlaceOfOrdination(null);
        }
    },
    MEMBERSHIP("clients:profile.membership") {
        @Override
        public void clear(ClientDetailResponse r) {
            r.setDateJoined(null);
            r.setMembershipRemarks(null);
            r.setComments(null);
        }
    },
    WELLBEING("clients:profile.wellbeing") {
        @Override
        public void clear(ClientDetailResponse r) {
            r.setWellbeingLivingConditions(false);
            r.setWellbeingMentalHealth(false);
            r.setWellbeingPhysicalHealth(false);
            r.setWellbeingFinancialStability(false);
            r.setWellbeingSocialSupport(false);
            r.setWellbeingLegalIssues(false);
            r.setWellbeingSpiritual(false);
            r.setWellbeingRemarks(null);
        }
    },
    NEEDS("clients:profile.needs") {
        @Override
        public void clear(ClientDetailResponse r) {
            r.setSpecialNeeds(null);
            r.setSpecialNeedsRemarks(null);
            r.setBankTransferInfo(null);
            r.setPayNowInfo(null);
        }
    };

    private final String capKey;

    ClientProfileSection(String capKey) {
        this.capKey = capKey;
    }

    public String capKey() {
        return capKey;
    }

    /** Blanks out this section's fields on the given response. */
    public abstract void clear(ClientDetailResponse r);

    /** Masks every section for which {@code hasCap} returns false. */
    public static void applyVisibility(ClientDetailResponse response, Predicate<String> hasCap) {
        for (ClientProfileSection section : values()) {
            if (!hasCap.test(section.capKey)) {
                section.clear(response);
            }
        }
    }
}
