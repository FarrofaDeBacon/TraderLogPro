import { safeInvoke, isTauri } from "$lib/services/tauri";
import { type UserProfile } from "$lib/types";
import { validateLicenseKey, type LicenseData } from "$lib/utils/license";

export class UserProfileStore {
    userProfile = $state<UserProfile>({
        id: "main",
        name: "",
        email: "",
        phone: "",
        cpf: "",
        theme: "",
        language: "pt-BR",
        timezone: "America/Sao_Paulo",
        main_currency: "BRL",
        avatar: null,
        convert_all_to_main: false,
        onboarding_completed: typeof window !== "undefined" && !isTauri(),
        currency_api_url: "https://economia.awesomeapi.com.br/last/",
        birth_date: null,
        trial_start_date: null,
        license_key: null,
        utc_offset: -180, // Default to Brasilia
    });

    hardwareId = $state<string>("");
    licenseDetails = $state<LicenseData | null>(null);
    isLoadingData = $state<boolean>(false);

    isLoggedIn = $state<boolean>(
        typeof window !== "undefined" ? localStorage.getItem("isLoggedIn") === "true" : false
    );

    // Computed license info
    licenseStatus = $derived.by(() => {
        if (this.licenseDetails?.valid) return "active";
        if (!this.userProfile.trial_start_date) return "trial";

        const start = new Date(this.userProfile.trial_start_date);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > 7 ? "expired" : "trial";
    });

    trialDaysLeft = $derived.by(() => {
        if (!this.userProfile.trial_start_date) return 7;
        const start = new Date(this.userProfile.trial_start_date);
        const now = new Date();
        const diffTime = now.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, 7 - diffDays);
    });

    licensePlanName = $derived(this.licenseDetails?.plan || "Trial");

    licenseTotalDays = $derived.by(() => {
        if (this.licensePlanName === "Lifetime") return null;
        if (!this.licenseDetails?.expiration || !this.licenseDetails?.createdAt) return null;
        const start = new Date(this.licenseDetails.createdAt);
        const end = new Date(this.licenseDetails.expiration);
        const diffTime = end.getTime() - start.getTime();
        return Math.round(diffTime / (1000 * 60 * 60 * 24));
    });

    licenseDaysRemaining = $derived.by(() => {
        if (this.licensePlanName === "Lifetime") return null;
        if (!this.licenseDetails?.expiration) return null;
        const end = new Date(this.licenseDetails.expiration);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    });

    async refreshLicenseStatus() {
        if (!this.userProfile.license_key) {
            console.log("[UserProfileStore] No license key found, skipping refresh.");
            return;
        }

        console.log("[UserProfileStore] Refreshing license status for key:", this.userProfile.license_key.substring(0, 10) + "...");

        try {
            console.log("[UserProfileStore] Validating license for machine PIN:", this.hardwareId);

            let result = await validateLicenseKey(this.userProfile.license_key, this.hardwareId);
            
            console.log("[UserProfileStore] License Validation Result:", result);
            this.licenseDetails = result;
        } catch (e) {
            console.error("[UserProfileStore] Error refreshing license:", e);
        }
    }

    async deactivateLicense() {
        this.userProfile.license_key = null;
        this.licenseDetails = null;
        await this.saveUserProfile();
        console.log("[UserProfileStore] License deactivated.");
    }

    async saveUserProfile() {
        try {
            await safeInvoke("save_user_profile", { profile: $state.snapshot(this.userProfile) });
            return { success: true };
        } catch (e: any) {
            console.error("[UserProfileStore] Error saving user profile:", e);
            return { success: false, error: e.toString() };
        }
    }

    updateUserProfile(data: Partial<UserProfile>) {
        this.userProfile = { ...this.userProfile, ...data };
        this.saveUserProfile();
        if (typeof window !== "undefined" && data.language) {
            localStorage.setItem("locale", data.language);
        }
        if (data.license_key !== undefined || data.name || data.cpf || data.birth_date) {
            this.refreshLicenseStatus();
        }
    }

    async login(_email: string, pass: string): Promise<boolean> {
        try {
            const isValid = await safeInvoke<boolean>("verify_password", { password: pass });
            if (isValid) {
                this.isLoggedIn = true;
                localStorage.setItem("isLoggedIn", "true");
            }
            return !!isValid;
        } catch (e) {
            console.error("[UserProfileStore] Login failed:", e);
            throw e;
        }
    }

    logout() {
        this.isLoggedIn = false;
        localStorage.removeItem("isLoggedIn");
        console.log("[UserProfileStore] User logged out");
        window.location.href = "/login";
    }

    async loadData() {
        try {
            const profile = await safeInvoke<UserProfile>("get_user_profile");
            const hwid = await safeInvoke<string>("get_machine_id_cmd");

            if (hwid) this.hardwareId = hwid;
            if (profile) {
                this.userProfile = { ...this.userProfile, ...profile };
                console.log("[UserProfileStore] User Profile loaded and processed.");
            } else {
                console.warn("[UserProfileStore] No profile found, using defaults.");
            }

            if (this.userProfile.license_key && this.hardwareId) {
                this.refreshLicenseStatus();
            }
        } catch (error) {
            console.error("[UserProfileStore] Error loading user profile data:", error);
        }
    }
}

export const userProfileStore = new UserProfileStore();
