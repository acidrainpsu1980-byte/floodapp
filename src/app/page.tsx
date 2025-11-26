import Link from "next/link";
import Button from "@/components/Button";
import Card from "@/components/Card";

import EvacueeStats from "@/components/EvacueeStats";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[var(--background)] to-blue-50">
      <div className="container max-w-4xl animate-fade-in">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--primary)] mb-4">
            ระบบช่วยเหลือผู้ประสบภัยน้ำท่วมหาดใหญ่
          </h1>
          <p className="text-xl text-[var(--text-secondary)]">
            เชื่อมต่อผู้ประสบภัยกับทีมกู้ภัยอย่างรวดเร็วและมีประสิทธิภาพ
          </p>
        </div>

        <div className="mb-12 transform hover:scale-105 transition-transform duration-300">
          <Link href="/evacuees" className="block group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            <div className="relative bg-white border-2 border-blue-500 rounded-2xl p-8 shadow-2xl hover:bg-blue-50 transition-all overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider shadow-md">
                Update ล่าสุด (Real-time)
              </div>
              <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                <div className="text-8xl bg-blue-100 p-6 rounded-full shadow-inner animate-bounce-slow">🏠</div>
                <div className="text-center md:text-left flex-1">
                  <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-3 group-hover:text-blue-700 transition-colors">
                    ตรวจสอบรายชื่อผู้อพยพ
                  </h2>
                  <p className="text-xl text-slate-600 mb-6">
                    ศูนย์พักพิงผู้ประสบภัย มหาวิทยาลัยสงขลานครินทร์ (ม.อ.)
                  </p>
                  <span className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-10 py-4 rounded-full font-bold text-xl shadow-lg group-hover:shadow-blue-500/50 transition-all">
                    🔍 ค้นหารายชื่อทันที
                  </span>
                </div>
              </div>
            </div>
          </Link>
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-600">
              หากค้นหาทางนี้ไม่พบข้อมูล สามารถค้นหาเพิ่มเติมได้จาก{' '}
              <a
                href="https://hakon.psu.ac.th/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline font-medium"
              >
                hakon.psu.ac.th
              </a>
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-t-4 border-t-[var(--secondary)]">
            <div className="flex flex-col items-center text-center h-full justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--secondary)] mb-2">ฉันต้องการความช่วยเหลือ</h2>
                <p className="text-[var(--text-secondary)]">
                  หากคุณติดอยู่ในพื้นที่น้ำท่วมหรือต้องการเสบียง แจ้งขอความช่วยเหลือที่นี่
                </p>
              </div>
              <Link href="/request" className="w-full">
                <Button variant="secondary" fullWidth size="lg">
                  แจ้งขอความช่วยเหลือ
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-t-4 border-t-[var(--primary)]">
            <div className="flex flex-col items-center text-center h-full justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--primary)] mb-2">สำหรับเจ้าหน้าที่กู้ภัย</h2>
                <p className="text-[var(--text-secondary)]">
                  ดูรายการคำร้องขอและจัดการภารกิจช่วยเหลือ
                </p>
              </div>
              <Link href="/dashboard" className="w-full">
                <Button variant="primary" fullWidth size="lg">
                  เข้าสู่แดชบอร์ด
                </Button>
              </Link>
            </div>
          </Card>
        </div>



        {/* Evacuee Statistics Section */}
        <EvacueeStats />

        <footer className="mt-16 text-center text-[var(--text-secondary)] text-sm">
          <p>© 2025 ระบบช่วยเหลือผู้ประสบภัยน้ำท่วมหาดใหญ่. ด้วยความห่วงใย.</p>
        </footer>
      </div>
    </main>
  );
}
