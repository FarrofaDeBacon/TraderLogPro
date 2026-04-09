import tkinter as tk
from tkinter import ttk, messagebox
import hmac
import hashlib
import json
import base64
import datetime
import re

# --- CONFIG ---
SECRET_KEY = "TRADERLOGPRO_SECRET_KEY_2026"
VERSION = "v1"
PREFIX = "TLP"

# --- COLORS (TraderLogPro Institutional Palette) ---
BG_COLOR = "#070708"      # Deeper black
CARD_COLOR = "#0f1115"    # Dark navy/zinc
ACCENT_COLOR = "#3b82f6"  # Blue 500
TEXT_COLOR = "#f8fafc"    # slate 50
SUBTEXT_COLOR = "#94a3b8" # slate 400
BORDER_COLOR = "#1e293b"  # slate 800
SUCCESS_COLOR = "#10b981" # emerald 500

class ModernLicenseGenerator:
    def __init__(self, root):
        self.root = root
        self.root.title("TraderLogPro | Master License Engine")
        self.root.geometry("540x720")
        self.root.configure(bg=BG_COLOR)
        
        # Set fonts
        self.font_main = ("Inter", 10)
        self.font_bold = ("Inter", 10, "bold")
        self.font_header = ("Inter", 18, "bold")
        self.font_mono = ("Cascadia Code", 9)

        self.setup_styles()
        self.is_lifetime = tk.BooleanVar(value=False)
        self.hwid_input_var = tk.StringVar()
        self.cid_var = tk.StringVar()
        self.create_widgets()

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use('clam')
        
        style.configure("TFrame", background=BG_COLOR)
        style.configure("Card.TFrame", background=CARD_COLOR, borderwidth=0)
        
        style.configure("TLabel", background=BG_COLOR, foreground=TEXT_COLOR, font=self.font_main)
        style.configure("Card.TLabel", background=CARD_COLOR, foreground=TEXT_COLOR, font=self.font_main)
        style.configure("Header.TLabel", background=BG_COLOR, foreground=ACCENT_COLOR, font=self.font_header)
        style.configure("Sub.TLabel", background=BG_COLOR, foreground=SUBTEXT_COLOR, font=("Inter", 9))
        
        style.configure("Primary.TButton", background=ACCENT_COLOR, foreground="white", font=self.font_bold, borderwidth=0)
        style.map("Primary.TButton", background=[("active", "#2563eb")])
        
        style.configure("Secondary.TButton", background=BORDER_COLOR, foreground=TEXT_COLOR, font=self.font_main)
        style.configure("TCheckbutton", background=CARD_COLOR, foreground=TEXT_COLOR, font=self.font_main)

    def create_widgets(self):
        # Header
        header_frame = ttk.Frame(self.root, padding=(30, 30, 30, 10))
        header_frame.pack(fill="x")
        
        ttk.Label(header_frame, text="TraderLogPro", style="Header.TLabel").pack(anchor="w")
        ttk.Label(header_frame, text="VENDEDOR / ADMINISTRADOR - GERADOR DE LICENÇAS", style="Sub.TLabel").pack(anchor="w")

        # Container Scrollable (if needed)
        main_container = ttk.Frame(self.root, padding=(30, 10, 30, 30))
        main_container.pack(fill="both", expand=True)

        # Helper Section: PIN Calculator
        self.create_pin_helper(main_container)

        # Divider
        ttk.Separator(main_container, orient="horizontal").pack(fill="x", pady=20)

        # License Generation Section
        self.create_gen_form(main_container)

    def create_pin_helper(self, parent):
        label = ttk.Label(parent, text="1. CALCULADORA DE PIN (HARDWARE ID)", font=self.font_bold)
        label.pack(anchor="w", pady=(0, 10))

        card = tk.Frame(parent, bg=CARD_COLOR, padx=15, pady=15, highlightthickness=1, highlightbackground=BORDER_COLOR)
        card.pack(fill="x")

        ttk.Label(card, text="Hardware ID (UUID do App):", style="Card.TLabel").pack(anchor="w")
        entry = tk.Entry(card, textvariable=self.hwid_input_var, bg=BG_COLOR, fg=TEXT_COLOR, 
                         insertbackground=TEXT_COLOR, bd=0, font=self.font_mono, highlightthickness=1, 
                         highlightbackground=BORDER_COLOR, highlightcolor=ACCENT_COLOR)
        entry.pack(fill="x", pady=(5, 10), ipady=8)

        btn = tk.Button(card, text="CONVERTER PARA PIN DO DISPOSITIVO", command=self.calculate_pin,
                       bg="#1e293b", fg="white", font=self.font_bold, bd=0, cursor="hand2", pady=8)
        btn.pack(fill="x")

    def create_gen_form(self, parent):
        ttk.Label(parent, text="2. DADOS DA LICENÇA", font=self.font_bold).pack(anchor="w", pady=(0, 10))

        form_card = tk.Frame(parent, bg=CARD_COLOR, padx=15, pady=15, highlightthickness=1, highlightbackground=BORDER_COLOR)
        form_card.pack(fill="both", expand=True)

        # CID / PIN
        ttk.Label(form_card, text="Customer ID / Device PIN (12 chars):", style="Card.TLabel").pack(anchor="w")
        cid_entry = tk.Entry(form_card, textvariable=self.cid_var, bg=BG_COLOR, fg=SUCCESS_COLOR, 
                             insertbackground=TEXT_COLOR, bd=0, font=self.font_bold, highlightthickness=1, 
                             highlightbackground=BORDER_COLOR, highlightcolor=SUCCESS_COLOR)
        cid_entry.pack(fill="x", pady=(5, 15), ipady=8)

        # Plan & Days
        row = ttk.Frame(form_card, style="Card.TFrame")
        row.pack(fill="x", pady=(0, 15))

        p_col = ttk.Frame(row, style="Card.TFrame")
        p_col.pack(side="left", fill="x", expand=True, padx=(0, 10))
        ttk.Label(p_col, text="Plano:", style="Card.TLabel").pack(anchor="w")
        self.plan_var = tk.StringVar(value="Pro")
        p_combo = ttk.Combobox(p_col, textvariable=self.plan_var, state="readonly", values=("Pro", "Trial", "Enterprise", "Lifetime"))
        p_combo.pack(fill="x", pady=5)

        d_col = ttk.Frame(row, style="Card.TFrame")
        d_col.pack(side="left", fill="x", expand=True)
        ttk.Label(d_col, text="Duração (Dias):", style="Card.TLabel").pack(anchor="w")
        self.days_var = tk.StringVar(value="30")
        self.days_entry = tk.Entry(d_col, textvariable=self.days_var, bg=BG_COLOR, fg=TEXT_COLOR, bd=0, highlightthickness=1, highlightbackground=BORDER_COLOR)
        self.days_entry.pack(fill="x", pady=5, ipady=4)

        ttk.Checkbutton(form_card, text="Licença Vitalícia (Sem Expiração)", variable=self.is_lifetime, command=self.on_lifetime_toggle, style="TCheckbutton").pack(anchor="w")

        # Generate Button
        btn = tk.Button(form_card, text="GERAR E EXPORTAR ARQUIVO .LIC", command=self.generate_key,
                       bg=ACCENT_COLOR, fg="white", font=self.font_bold, bd=0, cursor="hand2", pady=12)
        btn.pack(fill="x", pady=(20, 15))

        self.output_text = tk.Text(form_card, height=3, bg=BG_COLOR, fg=SUBTEXT_COLOR, 
                                   font=self.font_mono, bd=0, padx=8, pady=8, highlightthickness=1, 
                                   highlightbackground=BORDER_COLOR, wrap="char")
        self.output_text.pack(fill="x")
        self.output_text.config(state="disabled")

    def on_lifetime_toggle(self):
        if self.is_lifetime.get():
            self.days_entry.config(state="disabled", disabledbackground=BG_COLOR)
            self.plan_var.set("Lifetime")
        else:
            self.days_entry.config(state="normal")
            self.plan_var.set("Pro")

    def calculate_pin(self):
        hwid = self.hwid_input_var.get().strip()
        if not hwid:
            messagebox.showwarning("Aviso", "Por favor, insira o Hardware ID.")
            return
        
        # Parity with computeDeviceIdentity (license.ts)
        # raw = `TLP-HWID-${hwid}`
        raw = f"TLP-HWID-{hwid}"
        hash_hex = hashlib.sha256(raw.encode('utf-8')).hexdigest().upper()
        pin = hash_hex[:12]
        
        self.cid_var.set(pin)
        messagebox.showinfo("PIN Gerado", f"O PIN do Dispositivo foi gerado e copiado para o formulário:\n\n{pin}")

    def generate_key(self):
        try:
            plan = self.plan_var.get()
            cid = self.cid_var.get().strip().upper()
            self.current_cid = cid if cid else "Universal"
            
            exp_iso = None
            if not self.is_lifetime.get():
                try:
                    days = int(self.days_var.get())
                    exp_date = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=days)
                    exp_iso = exp_date.isoformat().replace("+00:00", "Z")
                except ValueError:
                    messagebox.showerror("Erro", "Duração inválida.")
                    return
            
            payload = {
                "plan": plan,
                "exp": exp_iso,
                "cid": cid,
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
            }
            
            payload_json = json.dumps(payload, separators=(',', ':'))
            payload_b64 = base64.b64encode(payload_json.encode('utf-8')).decode('utf-8')
            data_to_sign = f"{PREFIX}-{VERSION}-{payload_b64}"
            
            signature = hmac.new(SECRET_KEY.encode('utf-8'), data_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()
            final_key = f"{data_to_sign}-{signature}"
            
            self.output_text.config(state="normal")
            self.output_text.delete("1.0", tk.END)
            self.output_text.insert("1.0", final_key)
            self.output_text.config(state="disabled")
            
            self.export_lic(final_key)
            
        except Exception as e:
            messagebox.showerror("Erro", str(e))

    def export_lic(self, key):
        from tkinter import filedialog
        safe_cid = re.sub(r'[^A-Z0-9-]', '', str(self.current_cid).upper()) or "license"
        file_path = filedialog.asksaveasfilename(defaultextension=".lic", initialfile=f"{safe_cid}.lic", title="Salvar Licença")
        if file_path:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(key)
            messagebox.showinfo("Sucesso", "Licença exportada!")

if __name__ == "__main__":
    root = tk.Tk()
    ModernLicenseGenerator(root)
    root.mainloop()
