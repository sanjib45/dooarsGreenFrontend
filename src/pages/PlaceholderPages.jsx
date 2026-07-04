const placeholder = (title, icon, desc) => () => (
  <div>
    <div className="flex justify-between items-end mb-8">
      <div>
        <h1 className="font-headline text-3xl font-semibold text-primary">{title}</h1>
        <p className="text-on-surface-variant mt-1">{desc}</p>
      </div>
    </div>
    <div className="glass-card rounded-3xl p-16 flex flex-col items-center justify-center shadow-xl shadow-primary/5">
      <span className="material-symbols-outlined text-6xl text-primary/30 mb-4">{icon}</span>
      <h2 className="font-headline text-xl font-semibold text-primary/50 mb-2">{title} Module</h2>
      <p className="text-on-surface-variant text-sm">Coming soon — connect your backend to activate this module.</p>
    </div>
  </div>
);

export const LaborPage = placeholder('Labor Management', 'groups', 'Track workers, attendance, shifts and wages.');
export const FactoryPage = placeholder('Factory', 'potted_plant', 'Monitor factory orders, buyers and dispatch records.');
export const PaymentsPage = placeholder('Payments & Payroll', 'payments', 'Process salaries, advances and deductions.');
export const ReportsPage = placeholder('Reports & Analytics', 'assessment', 'View insights, trends and export data.');
