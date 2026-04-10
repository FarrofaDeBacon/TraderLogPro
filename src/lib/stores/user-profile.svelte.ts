import { safeInvoke, isTauri } from "$lib/services/tauri";
import { type UserProfile } from "$lib/types";
import { validateLicenseKey, activateLicenseOnline, verifyLicenseOnline, type LicenseData } from "$lib/utils/license";

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
        in_guarantee: false,
        guarantee_days_left: 0,
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
        const expDate = this.licenseDetails?.realExpiration || this.licenseDetails?.expiration;
        // Se temos a data real mas não o createdAt (v5), usamos o purchase_date do perfil como fallback para o cálculo total
        const startDate = this.licenseDetails?.createdAt || this.userProfile.trial_start_date; 
        
        if (!expDate || !startDate) return null;
        const start = new Date(startDate);
        const end = new Date(expDate);
        const diffTime = end.getTime() - start.getTime();
        return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    });

    licenseDaysRemaining = $derived.by(() => {
        if (this.licensePlanName === "Lifetime") return null;
        const expDate = this.licenseDetails?.realExpiration || this.licenseDetails?.expiration;
        if (!expDate) return null;
        const end = new Date(expDate);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    });

    async refreshLicenseStatus() {
        if (!this.userProfile.license_key) {
            console.log("[UserProfileStore] No license key found, skipping refresh.");
            return;
        }

        try {
            let result = await validateLicenseKey(this.userProfile.license_key, this.hardwareId);
            this.licenseDetails = result;

            // Se a licença local for válida, faz um check-in online silencioso (Heartbeat)
            if (result.valid && this.userProfile.email) {
                this.performOnlineHeartbeat();
            }
        } catch (e) {
            console.error("[UserProfileStore] Error refreshing license:", e);
        }
    }

    async performOnlineHeartbeat() {
        if (!this.userProfile.email) return;
        try {
            const res = await verifyLicenseOnline(this.userProfile.email);
            if (!res.valid) {
                console.warn("[Security] License revoked online! Deactivating...");
                this.deactivateLicense();
            }
        } catch (e) {
            console.error("[Security] Online heartbeat failed (Offline?)", e);
        }
    }

    async deactivateLicense() {
        this.userProfile.license_key = null;
        this.licenseDetails = null;
        await this.saveUserProfile();
        console.log("[UserProfileStore] License deactivated.");
    }

    async activateOnline(email: string) {
        try {
            const res = await activateLicenseOnline(email, this.hardwareId);
            if (res.success && res.license) {
                this.userProfile.license_key = res.license;
                this.userProfile.in_guarantee = res.inGuarantee || false;
                this.userProfile.guarantee_days_left = res.daysLeft || 0;
                this.userProfile.email = email; // Garante que o email está salvo

                await this.saveUserProfile();
                await this.refreshLicenseStatus();
                return { success: true };
            }
            return { success: false, error: res.error || "Código de erro desconhecido." };
        } catch (e: any) {
            console.error("[UserProfileStore] Activation error:", e);
            return { success: false, error: e.toString() };
        }
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
                
                // --- TRIAL INITIALIZATION ---
                // If onboarding is done but trial_start_date is missing, set it now
                if (this.userProfile.onboarding_completed && !this.userProfile.trial_start_date) {
                    console.log("[UserProfileStore] First run detected, initializing trial start date.");
                    this.userProfile.trial_start_date = new Date().toISOString();
                    await this.saveUserProfile();
                }
                
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
