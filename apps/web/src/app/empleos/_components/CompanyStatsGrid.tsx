import { Award, Briefcase, TrendingUp, Users } from "lucide-react";

interface CompanyStatsGridProps {
  stats: {
    activeJobs: number;
    totalApplicants: number;
    interviewing: number;
    hired: number;
  };
}

export default function CompanyStatsGrid({ stats }: CompanyStatsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up stagger-1">
      {[
        { label: "Vacantes activas", value: stats.activeJobs,      icon: <Briefcase  size={16} />, color: "cyan"    },
        { label: "Total candidatos", value: stats.totalApplicants, icon: <Users      size={16} />, color: "violet"  },
        { label: "En entrevistas",   value: stats.interviewing,    icon: <TrendingUp size={16} />, color: "purple"  },
        { label: "Contratados",      value: stats.hired,           icon: <Award      size={16} />, color: "emerald" },
      ].map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex items-center gap-3"
        >
          <div className={`w-9 h-9 rounded-xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600 shrink-0`}>
            {stat.icon}
          </div>
          <div>
            <p className={`text-2xl font-extrabold text-${stat.color}-600 leading-none`}>{stat.value}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
