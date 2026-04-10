import { invoke } from "@tauri-apps/api/core";

export interface LicenseData {
    valid: boolean;
    plan: "Trial" | "Pro" | "Lifetime";
    expiration: string | null; // ISO Date
    createdAt?: string | null;  // ISO Date
    error?: string;
}

export async function validateLicenseKey(key: string, _expectedCustomerId?: string): Promise<LicenseData> {
    try {
        console.log("[License] Delegating validation to Rust backend...");

        // Use the new Rust command for security (HMAC with secret hidden in binary)
        const result: any = await invoke("validate_license_cmd", {
            key: key.trim(),
            expectedCid: _expectedCustomerId || ""
        });

        if (!result.valid) {
            return {
                valid: false,
                plan: result.plan || "Trial",
                expiration: result.expiration,
                error: result.error || "Licença inválida."
            };
        }

        return {
            valid: true,
            plan: result.plan as any,
            expiration: result.expiration,
        };

    } catch (e) {
        console.error("License Validation Error:", e);
        return { valid: false, plan: "Trial", expiration: null, error: "Erro de comunicação com o sistema de segurança." };
    }
}

/**
 * Automático: Conecta-se ao Portal na nuvem para ativar a licença sem arquivos manuais.
 */
export async function activateLicenseOnline(email: string, pin: string): Promise<{ success: boolean; license?: string; error?: string }> {
    try {
        console.log("[License] Requesting online activation (via Rust) for:", email);
        const result: any = await invoke("activate_license_online_cmd", {
            email: email.trim(),
            pin: pin
        });
        return result;
    } catch (e: any) {
        console.error("[License] Online activation failed:", e);
        return { success: false, error: "Falha na conexão com o servidor de licenças." };
    }
}
