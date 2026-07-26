interface AdminTabsProps<T extends string> {
  tabs: readonly T[];
  activeTab: T;
  onChange: (tab: T) => void;
}

export default function AdminTabs<T extends string>({ tabs, activeTab, onChange }: AdminTabsProps<T>) {
  return (
    <div className="flex gap-1.5 bg-white border border-slate-200/60 rounded-xl p-1.5 w-fit animate-fade-in-up stagger-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === tab
              ? "bg-amber-50 text-amber-700 shadow-sm"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
