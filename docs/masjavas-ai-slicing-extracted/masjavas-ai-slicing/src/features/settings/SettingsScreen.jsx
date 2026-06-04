import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { SettingsCard } from "../../components/shared/PrimitiveBlocks";

export function SettingsScreen() {
  return (
    <div>
      <ScreenHeader badge="Pengaturan" title="Pengaturan dibuat sederhana" desc="Provider, validasi, dan proses teknis tetap di belakang layar." cta="Simpan pengaturan" />
      <div className="grid gap-6 xl:grid-cols-3">
        <SettingsCard title="Akun" items={["Nama workspace", "Email login", "Bahasa aplikasi"]} />
        <SettingsCard title="Preferensi Video" items={["Format default", "Gaya narasi favorit", "Preset sering dipakai"]} />
        <SettingsCard title="Paket" items={["Kuota video", "Riwayat download", "Upgrade paket"]} />
      </div>
    </div>
  );
}
