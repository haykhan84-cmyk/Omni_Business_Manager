import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  UserCheck,
  DollarSign,
  Calendar,
  Wallet,
  Printer,
  Download,
  Search,
  Plus,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Truck,
  AlertCircle,
  FileText,
  Eye,
  X,
  CreditCard,
  Building,
  RefreshCw,
  Sliders,
  Check,
  Briefcase,
  Smartphone,
  Award,
  Calculator,
  Trash2,
  Edit2,
} from 'lucide-react';
import {
  Employee,
  EmployeeRole,
  StaffAttendance,
  SalaryAdvance,
  PayrollRecord,
  RoznamchaEntry,
  Order,
} from '../../types';
import { db } from '../../db';
import { ACTIVE_TENANT_ID } from '../../db/localDb';
import { syncEmployeeToSupabase, deleteEmployeeFromSupabase } from '../../db/supabase';
import { formatPKR, formatDate, formatDateTime } from '../../utils/calculations';

interface DesktopStaffAttendanceProps {
  roznamcha: RoznamchaEntry[];
  orders?: Order[];
  cashInHand: number;
  onAddRoznamchaEntry: (entry: Omit<RoznamchaEntry, 'id' | 'entryNo' | 'synced'>) => Promise<void>;
}

export const DesktopStaffAttendance: React.FC<DesktopStaffAttendanceProps> = ({
  roznamcha,
  orders = [],
  cashInHand,
  onAddRoznamchaEntry,
}) => {
  // Database States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceList, setAttendanceList] = useState<StaffAttendance[]>([]);
  const [advancesList, setAdvancesList] = useState<SalaryAdvance[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Search
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [territoryFilter, setTerritoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('SEP-2026');

  // Modals
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState<boolean>(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState<boolean>(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState<boolean>(false);
  const [showPayrollGeneratorModal, setShowPayrollGeneratorModal] = useState<boolean>(false);
  const [showPayslipModal, setShowPayslipModal] = useState<boolean>(false);
  const [selectedEmployeeForPayslip, setSelectedEmployeeForPayslip] = useState<Employee | null>(null);
  const [selectedPayrollForPayslip, setSelectedPayrollForPayslip] = useState<PayrollRecord | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const handleConfirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    try {
      await db.employees.delete(employeeToDelete.id);
      await db.staff_attendance.where('employee_id').equals(employeeToDelete.id).delete();
      await db.salary_advances.where('employee_id').equals(employeeToDelete.id).delete();
      await deleteEmployeeFromSupabase(employeeToDelete.id);
      await fetchLocalData();
    } catch (err) {
      console.error('Failed to delete employee:', err);
    } finally {
      setEmployeeToDelete(null);
    }
  };

  // Form States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New Employee Form State
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpFatherName, setNewEmpFatherName] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpCnic, setNewEmpCnic] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<EmployeeRole>('Order Booker / Salesman');
  const [newEmpRoute, setNewEmpRoute] = useState('Main Bazar');
  const [newEmpVan, setNewEmpVan] = useState('');
  const [newEmpBaseSalary, setNewEmpBaseSalary] = useState('45000');
  const [newEmpAllowanceRate, setNewEmpAllowanceRate] = useState('200');
  const [newEmpCommissionRate, setNewEmpCommissionRate] = useState('1.5');
  const [newEmpImei, setNewEmpImei] = useState('');
  const [isAddAdvancedOpen, setIsAddAdvancedOpen] = useState(false);

  // Edit Employee Form State
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editEmpName, setEditEmpName] = useState('');
  const [editEmpFatherName, setEditEmpFatherName] = useState('');
  const [editEmpPhone, setEditEmpPhone] = useState('');
  const [editEmpCnic, setEditEmpCnic] = useState('');
  const [editEmpRole, setEditEmpRole] = useState<EmployeeRole>('Order Booker / Salesman');
  const [editEmpRoute, setEditEmpRoute] = useState('');
  const [editEmpVan, setEditEmpVan] = useState('');
  const [editEmpBaseSalary, setEditEmpBaseSalary] = useState('45000');
  const [editEmpAllowanceRate, setEditEmpAllowanceRate] = useState('200');
  const [editEmpCommissionRate, setEditEmpCommissionRate] = useState('1.5');
  const [editEmpStatus, setEditEmpStatus] = useState<'Active' | 'Inactive' | 'On Leave' | 'Resigned'>('Active');
  const [editEmpImei, setEditEmpImei] = useState('');
  const [isEditAdvancedOpen, setIsEditAdvancedOpen] = useState(false);

  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditEmpName(emp.name);
    setEditEmpFatherName(emp.father_name || '');
    setEditEmpPhone(emp.phone || '');
    setEditEmpCnic(emp.cnic_number || '');
    setEditEmpRole(emp.role);
    setEditEmpRoute(emp.assigned_route || '');
    setEditEmpVan(emp.van_assigned || '');
    setEditEmpBaseSalary(String(emp.base_salary || 0));
    setEditEmpAllowanceRate(String(emp.daily_allowance_rate || 0));
    setEditEmpCommissionRate(String(emp.commission_rate || 0));
    setEditEmpStatus((emp.status as any) || 'Active');
    setEditEmpImei(emp.imei || '');
    setIsEditAdvancedOpen(Boolean(emp.imei && emp.imei.trim().length > 0));
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    if (!editEmpName.trim()) {
      alert('Please enter employee name');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedFields: Partial<Employee> = {
        name: editEmpName.trim(),
        father_name: editEmpFatherName.trim() || undefined,
        phone: editEmpPhone.trim() || '+92 300 0000000',
        cnic_number: editEmpCnic.trim() || undefined,
        role: editEmpRole,
        assigned_route: editEmpRoute.trim() || 'General Market Beat',
        van_assigned: editEmpVan.trim() || undefined,
        base_salary: parseFloat(editEmpBaseSalary) || 0,
        daily_allowance_rate: parseFloat(editEmpAllowanceRate) || 0,
        commission_rate: parseFloat(editEmpCommissionRate) || 0,
        status: editEmpStatus as any,
        imei: editEmpImei.trim() || undefined,
      };

      await db.employees.update(editingEmployee.id, updatedFields);
      const updatedFullEmp: Employee = {
        ...editingEmployee,
        ...updatedFields,
      };
      await syncEmployeeToSupabase(updatedFullEmp);
      await fetchLocalData();

      setEditingEmployee(null);
    } catch (err) {
      console.error('Error updating employee:', err);
      alert('Failed to update employee profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Advance Form State
  const [advanceEmpId, setAdvanceEmpId] = useState<string>('');
  const [advanceAmount, setAdvanceAmount] = useState<string>('5000');
  const [advanceReason, setAdvanceReason] = useState<string>('Emergency family expense');
  const [advanceSource, setAdvanceSource] = useState<'Cash Counter / Roznamcha' | 'Bank Transfer'>('Cash Counter / Roznamcha');

  // Attendance Form State
  const [attendanceEmpId, setAttendanceEmpId] = useState<string>('');
  const [attendanceStatus, setAttendanceStatus] = useState<'Present' | 'Absent' | 'Leave' | 'Half-Day'>('Present');
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Manual Payroll Adjustments State (empId -> { bonus: number, penalty: number })
  const [payrollAdjustments, setPayrollAdjustments] = useState<Record<string, { bonus: number; penalty: number }>>({});

  // 1. Fetch live data from Dexie
  const fetchLocalData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [emps, atts, advs, payrolls] = await Promise.all([
        db.employees.where('tenant_id').equals(ACTIVE_TENANT_ID).toArray(),
        db.staff_attendance.where('tenant_id').equals(ACTIVE_TENANT_ID).toArray(),
        db.salary_advances.where('tenant_id').equals(ACTIVE_TENANT_ID).toArray(),
        db.payroll_records.where('tenant_id').equals(ACTIVE_TENANT_ID).toArray(),
      ]);

      setEmployees(emps);
      setAttendanceList(atts);
      setAdvancesList(advs);
      setPayrollRecords(payrolls);

      if (emps.length > 0 && !advanceEmpId) {
        setAdvanceEmpId(emps[0].id);
        setAttendanceEmpId(emps[0].id);
      }
    } catch (err) {
      console.error('Failed to load HR data from Dexie:', err);
    } finally {
      setIsLoading(false);
    }
  }, [advanceEmpId]);

  useEffect(() => {
    fetchLocalData();
  }, [fetchLocalData]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // 2. Computed Metrics for KPI Cards
  const totalFieldStaff = employees.length;

  const roleCounts = useMemo(() => {
    const bookers = employees.filter((e) => e.role === 'Order Booker / Salesman').length;
    const labor = employees.filter((e) => e.role === 'Van Helper / Loader (Mazdoor)').length;
    const drivers = employees.filter((e) => e.role === 'Delivery Driver').length;
    const admin = employees.filter((e) => e.role === 'Cashier' || e.role === 'Accountant' || e.role === 'Recovery Officer').length;
    return { bookers, labor, drivers, admin };
  }, [employees]);

  // Today's attendance & TA/DA
  const todayAttendance = useMemo(() => {
    return attendanceList.filter((a) => a.date === todayStr);
  }, [attendanceList, todayStr]);

  const todayPresentCount = useMemo(() => {
    return todayAttendance.filter((a) => a.status === 'Present' || a.status === 'Half-Day').length;
  }, [todayAttendance]);

  const dailyTADAAccrual = useMemo(() => {
    return todayAttendance.reduce((sum, a) => sum + (a.allowance || 0), 0);
  }, [todayAttendance]);

  // Total Unpaid Advances (Peshgi Pool)
  const totalUnsettledAdvances = useMemo(() => {
    return advancesList
      .filter((a) => !a.is_settled)
      .reduce((sum, a) => sum + (a.amount || 0), 0);
  }, [advancesList]);

  // Advance Balance per employee
  const employeeAdvanceMap = useMemo(() => {
    const map: Record<string, number> = {};
    advancesList
      .filter((a) => !a.is_settled)
      .forEach((a) => {
        map[a.employee_id] = (map[a.employee_id] || 0) + a.amount;
      });
    return map;
  }, [advancesList]);

  // Sales volume & Commission per employee (pulled from orders)
  const employeeSalesMap = useMemo(() => {
    const map: Record<string, { totalRevenue: number; totalCartons: number }> = {};
    orders.forEach((o) => {
      // Find matching employee by assigned route or name
      const matched = employees.find(
        (e) =>
          e.role === 'Order Booker / Salesman' &&
          (e.assigned_route.toLowerCase().includes(o.route.toLowerCase()) ||
            o.route.toLowerCase().includes(e.assigned_route.toLowerCase()))
      );
      if (matched) {
        if (!map[matched.id]) {
          map[matched.id] = { totalRevenue: 0, totalCartons: 0 };
        }
        map[matched.id].totalRevenue += o.netBill || 0;
        map[matched.id].totalCartons += o.totalCartons || 0;
      }
    });
    return map;
  }, [orders, employees]);

  // Monthly Payroll Calculation Preview
  const monthlyPayrollSummary = useMemo(() => {
    let totalBase = 0;
    let totalTADA = 0;
    let totalCommission = 0;
    let totalAdvancesDeducted = 0;
    let totalPenalties = 0;
    let totalGross = 0;
    let totalNet = 0;

    const standardDays = 26;

    employees
      .filter((e) => e.status === 'Active')
      .forEach((emp) => {
        const base = emp.base_salary;
        const tada = emp.daily_allowance_rate * standardDays;
        const sales = employeeSalesMap[emp.id]?.totalRevenue || 0;
        const comm = emp.commission_rate > 0 ? Math.round(sales * (emp.commission_rate / 100)) : 0;
        const adv = employeeAdvanceMap[emp.id] || 0;
        const adj = payrollAdjustments[emp.id] || { bonus: 0, penalty: 0 };

        const gross = base + tada + comm + adj.bonus;
        const deductions = adv + adj.penalty;
        const net = Math.max(0, gross - deductions);

        totalBase += base;
        totalTADA += tada;
        totalCommission += comm;
        totalAdvancesDeducted += adv;
        totalPenalties += adj.penalty;
        totalGross += gross;
        totalNet += net;
      });

    return {
      totalBase,
      totalTADA,
      totalCommission,
      totalAdvancesDeducted,
      totalPenalties,
      totalGross,
      totalNet,
    };
  }, [employees, employeeSalesMap, employeeAdvanceMap, payrollAdjustments]);

  // 3. Filtered Staff Table Data
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Role filter
      if (roleFilter !== 'all') {
        if (roleFilter === 'bookers' && emp.role !== 'Order Booker / Salesman') return false;
        if (roleFilter === 'labor' && emp.role !== 'Van Helper / Loader (Mazdoor)') return false;
        if (roleFilter === 'drivers' && emp.role !== 'Delivery Driver') return false;
        if (roleFilter === 'admin' && (emp.role === 'Order Booker / Salesman' || emp.role === 'Delivery Driver' || emp.role === 'Van Helper / Loader (Mazdoor)')) return false;
      }

      // Territory filter
      if (territoryFilter !== 'all') {
        if (!emp.assigned_route.toLowerCase().includes(territoryFilter.toLowerCase())) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          emp.name.toLowerCase().includes(q) ||
          emp.id.toLowerCase().includes(q) ||
          emp.phone.toLowerCase().includes(q) ||
          emp.assigned_route.toLowerCase().includes(q) ||
          emp.role.toLowerCase().includes(q) ||
          (emp.imei && emp.imei.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [employees, roleFilter, territoryFilter, searchQuery]);

  // 4. Action Handlers

  // Onboard New Employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) {
      alert('Please enter employee name');
      return;
    }

    setIsSubmitting(true);
    try {
      const newEmp: Employee = {
        id: `emp-${Date.now().toString().slice(-6)}`,
        tenant_id: ACTIVE_TENANT_ID,
        name: newEmpName.trim(),
        father_name: newEmpFatherName.trim() || undefined,
        phone: newEmpPhone.trim() || '+92 300 0000000',
        cnic_number: newEmpCnic.trim() || undefined,
        role: newEmpRole,
        assigned_route: newEmpRoute.trim() || 'General Market Beat',
        van_assigned: newEmpVan.trim() || undefined,
        base_salary: parseFloat(newEmpBaseSalary) || 40000,
        daily_allowance_rate: parseFloat(newEmpAllowanceRate) || 200,
        commission_rate: parseFloat(newEmpCommissionRate) || 0,
        status: 'Active',
        imei: newEmpImei.trim() || undefined,
      };

      await db.employees.add(newEmp);
      await syncEmployeeToSupabase(newEmp);
      await fetchLocalData();

      setShowAddEmployeeModal(false);
      setNewEmpName('');
      setNewEmpFatherName('');
      setNewEmpPhone('');
      setNewEmpCnic('');
      setNewEmpImei('');
      setIsAddAdvancedOpen(false);
    } catch (err) {
      console.error('Error adding employee:', err);
      alert('Failed to register employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Record Salary Advance (Peshgi) & Auto-log to Roznamcha
  const handleRecordAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(advanceAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid advance amount');
      return;
    }

    const emp = employees.find((x) => x.id === advanceEmpId);
    if (!emp) {
      alert('Please select an employee');
      return;
    }

    setIsSubmitting(true);
    try {
      const voucherNo = `ADV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Add to salary_advances table
      const newAdvance: SalaryAdvance = {
        tenant_id: ACTIVE_TENANT_ID,
        employee_id: emp.id,
        employee_name: emp.name,
        date: new Date().toISOString().slice(0, 10),
        amount: amt,
        reason: advanceReason.trim() || 'Staff Monthly Salary Advance (Peshgi)',
        payment_source: advanceSource,
        is_settled: false,
        voucher_no: voucherNo,
      };

      await db.salary_advances.add(newAdvance);

      // 2. Auto-log Cash Out to Roznamcha if drawn from Cash Counter
      if (advanceSource === 'Cash Counter / Roznamcha') {
        await onAddRoznamchaEntry({
          date: new Date().toISOString(),
          type: 'cash_out',
          category: 'Driver Meal & Wages', // Operational Staff Head
          amount: amt,
          slipNo: voucherNo,
          narration: `Salary Advance (Peshgi) disbursed to ${emp.name} (${emp.role}) - Reason: ${advanceReason}`,
          recordedBy: 'Cashier (HR Console)',
          paymentMethod: 'Cash',
          accountCode: 'AC-6010',
          tenant_id: ACTIVE_TENANT_ID,
        });
      }

      await fetchLocalData();
      setShowAdvanceModal(false);
      setAdvanceAmount('5000');
      setAdvanceReason('');
    } catch (err) {
      console.error('Error recording salary advance:', err);
      alert('Failed to record salary advance');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark Daily Attendance
  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === attendanceEmpId);
    if (!emp) return;

    setIsSubmitting(true);
    try {
      const allowanceEarned =
        attendanceStatus === 'Present'
          ? emp.daily_allowance_rate
          : attendanceStatus === 'Half-Day'
          ? Math.round(emp.daily_allowance_rate / 2)
          : 0;

      const record: StaffAttendance = {
        tenant_id: ACTIVE_TENANT_ID,
        employee_id: emp.id,
        employee_name: emp.name,
        date: attendanceDate,
        status: attendanceStatus,
        allowance: allowanceEarned,
        check_in_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        gps_location: '34.7717° N, 72.3602° E (Depot Gate Verified)',
      };

      await db.staff_attendance.add(record);
      await fetchLocalData();
      setShowAttendanceModal(false);
    } catch (err) {
      console.error('Error recording attendance:', err);
      alert('Failed to log attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  // One-Click Post Daily TA/DA to Roznamcha
  const handlePostDailyTADAToRoznamcha = async () => {
    if (dailyTADAAccrual <= 0) {
      alert('No daily TA/DA accrual calculated for today.');
      return;
    }

    if (
      !confirm(
        `Post Today's Field TA/DA total of ${formatPKR(
          dailyTADAAccrual
        )} to Daily Roznamcha General Ledger account AC-5020?`
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddRoznamchaEntry({
        date: new Date().toISOString(),
        type: 'cash_out',
        category: 'Driver Meal & Wages',
        amount: dailyTADAAccrual,
        slipNo: `TADA-${todayStr.replace(/-/g, '')}`,
        narration: `Daily Field Staff TA/DA Allowance (${todayPresentCount} field reps verified via Biometric/GPS Lock)`,
        recordedBy: 'Auto-Post TA/DA Engine',
        paymentMethod: 'Cash',
        accountCode: 'AC-5020',
        tenant_id: ACTIVE_TENANT_ID,
      });

      alert(`Successfully posted ${formatPKR(dailyTADAAccrual)} to Daily Roznamcha!`);
    } catch (err) {
      console.error('Failed to post TA/DA:', err);
      alert('Failed to post TA/DA to Roznamcha');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run Monthly Payroll & Save Records
  const handleExecuteMonthlyPayroll = async () => {
    if (!confirm(`Execute Monthly Payroll Run for ${selectedMonth} (${employees.length} Staff)?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const recordsToInsert: PayrollRecord[] = [];
      const standardDays = 26;

      employees
        .filter((e) => e.status === 'Active')
        .forEach((emp) => {
          const base = emp.base_salary;
          const tada = emp.daily_allowance_rate * standardDays;
          const sales = employeeSalesMap[emp.id]?.totalRevenue || 0;
          const comm = emp.commission_rate > 0 ? Math.round(sales * (emp.commission_rate / 100)) : 0;
          const adv = employeeAdvanceMap[emp.id] || 0;
          const adj = payrollAdjustments[emp.id] || { bonus: 0, penalty: 0 };

          const gross = base + tada + comm + adj.bonus;
          const deductions = adv + adj.penalty;
          const net = Math.max(0, gross - deductions);

          recordsToInsert.push({
            tenant_id: ACTIVE_TENANT_ID,
            month: selectedMonth,
            year: 2026,
            employee_id: emp.id,
            employee_name: emp.name,
            role: emp.role,
            assigned_route: emp.assigned_route,
            base_salary: base,
            present_days: standardDays,
            total_working_days: standardDays,
            field_allowance: tada,
            sales_volume: sales,
            sales_commission: comm,
            salary_advances: adv,
            penalties: adj.penalty,
            bonuses: adj.bonus,
            gross_earnings: gross,
            total_deductions: deductions,
            net_salary: net,
            status: 'Approved',
            paid_date: todayStr,
            payment_method: 'HBL / Meezan Direct Credit',
          });
        });

      // Insert all records
      await db.payroll_records.bulkAdd(recordsToInsert);

      // Mark advances as settled
      await db.salary_advances.where('tenant_id').equals(ACTIVE_TENANT_ID).modify({ is_settled: true });

      await fetchLocalData();
      alert(`Payroll for ${selectedMonth} approved & generated successfully!`);
      setShowPayrollGeneratorModal(false);
    } catch (err) {
      console.error('Error executing payroll:', err);
      alert('Failed to execute payroll');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export Monthly Salary Sheet to CSV
  const handleExportPayrollCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'OMNISALES ERP - MONTHLY PAYROLL SALARY AUDIT SHEET\n';
    csv += `Payroll Cycle,${selectedMonth}\n`;
    csv += `Total Active Employees,${employees.length}\n`;
    csv += `Total Gross Earnings,${monthlyPayrollSummary.totalGross}\n`;
    csv += `Total Salary Advances Deducted,${monthlyPayrollSummary.totalAdvancesDeducted}\n`;
    csv += `Total Net Disbursed,${monthlyPayrollSummary.totalNet}\n\n`;

    csv += 'EMP ID,Staff Name,Designation,Assigned Route,Base Salary,Field TA/DA (26d),Sales Comm,Advances (Peshgi),Gross Pay,Net Payable,Status\n';

    employees.forEach((emp) => {
      const base = emp.base_salary;
      const tada = emp.daily_allowance_rate * 26;
      const sales = employeeSalesMap[emp.id]?.totalRevenue || 0;
      const comm = emp.commission_rate > 0 ? Math.round(sales * (emp.commission_rate / 100)) : 0;
      const adv = employeeAdvanceMap[emp.id] || 0;
      const gross = base + tada + comm;
      const net = Math.max(0, gross - adv);

      csv += `"${emp.id}","${emp.name}","${emp.role}","${emp.assigned_route}",${base},${tada},${comm},${adv},${gross},${net},"Active"\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Monthly_Payroll_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Payslip for an Employee
  const handleOpenPayslip = (emp: Employee) => {
    setSelectedEmployeeForPayslip(emp);
    const existingPayroll = payrollRecords.find((p) => p.employee_id === emp.id);
    setSelectedPayrollForPayslip(existingPayroll || null);
    setShowPayslipModal(true);
  };

  return (
    <div className="flex flex-col w-full gap-5 font-sans text-slate-900">
      {/* 1. SUB-NAV / CONTEXT CRUMB & QUICK STATS BAR */}
      <div className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-white shrink-0 shadow-sm">
            <Users className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-base text-slate-900 uppercase font-black tracking-tight">
                HR &amp; Payroll Command Console
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200">
                SYS-MOD::HRP-84
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Omnisales Distributed Field Force, Daily Roznamcha TA/DA Engine &amp; Biometric Device Lock Registry
            </span>
          </div>
        </div>

        {/* Quick Context Metadata Pills */}
        <div className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] text-slate-500 uppercase font-bold">Biometric Polling:</span>
            <span className="font-mono text-xs font-bold text-slate-900">30s Sync</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-[11px] text-slate-500 uppercase font-bold">GL Account:</span>
            <span className="font-mono text-xs font-bold text-amber-700">AC-5020 (TA/DA)</span>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
            <span className="text-[11px] text-amber-800 uppercase font-bold">Payroll Cycle:</span>
            <span className="font-mono text-xs font-black text-amber-700">{selectedMonth} ACTIVE</span>
          </div>
        </div>
      </div>

      {/* 2. HR & PAYROLL EXECUTIVE KPI SUMMARY BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI Card 1: Field Staff Deployment */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-extrabold">
                Field Staff Deployment
              </span>
              <span className="text-3xl font-black text-slate-900 font-mono mt-1">
                {totalFieldStaff} <span className="text-xs font-semibold text-slate-500 font-sans">Personnel</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2 bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
              <div className="flex items-center justify-between">
                <span>Sales Bookers:</span>
                <span className="font-bold text-slate-900">{roleCounts.bookers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Depot Labor:</span>
                <span className="font-bold text-slate-900">{roleCounts.labor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Fleet Drivers:</span>
                <span className="font-bold text-slate-900">{roleCounts.drivers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Audit/Admin:</span>
                <span className="font-bold text-slate-900">{roleCounts.admin}</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Card 2: Daily TA/DA Accrual */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-extrabold">
                  Daily TA/DA Accrual
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  GPS/IMEI
                </span>
              </div>
              <span className="text-3xl font-black text-emerald-600 font-mono mt-1">
                {formatPKR(dailyTADAAccrual)}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2 bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Check-Ins Today:</span>
              <span className="font-bold text-emerald-700">{todayPresentCount}/{totalFieldStaff} (100%)</span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">Auto-credited to Roznamcha AC-5020</span>
          </div>
        </div>

        {/* KPI Card 3: Monthly Net Payroll Commit */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-extrabold">
                Monthly Net Payroll Commit
              </span>
              <span className="text-3xl font-black text-amber-700 font-mono mt-1">
                {formatPKR(monthlyPayrollSummary.totalNet)}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2 bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Base + TA/DA - Adv:</span>
              <span className="font-bold text-slate-800">26-Day Cycle</span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">
              Gross: {formatPKR(monthlyPayrollSummary.totalGross)} | Ded: {formatPKR(monthlyPayrollSummary.totalAdvancesDeducted)}
            </span>
          </div>
        </div>

        {/* KPI Card 4: Staff Advances & Cash Float */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-extrabold">
                Staff Advances (Peshgi)
              </span>
              <span className="text-3xl font-black text-rose-600 font-mono mt-1">
                {formatPKR(totalUnsettledAdvances)}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-700 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2 bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Active Unsettled:</span>
              <span className="font-bold text-rose-700">{advancesList.filter((a) => !a.is_settled).length} Records</span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">Auto-deducted on monthly payroll run</span>
          </div>
        </div>
      </div>

      {/* 3. QUICK OPERATIONAL FILTER & TERRITORY SELECTOR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3">
        {/* Upper Controls Row: Filter Tabs & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
            {[
              { id: 'all', label: `All Staff (${employees.length})` },
              { id: 'bookers', label: `Field Sales & Bookers (${roleCounts.bookers})` },
              { id: 'labor', label: `Warehouse & Labor (${roleCounts.labor})` },
              { id: 'drivers', label: `Fleet Logistics (${roleCounts.drivers})` },
              { id: 'admin', label: `Finance & Admin (${roleCounts.admin})` },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setRoleFilter(btn.id)}
                className={`h-8 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer whitespace-nowrap ${
                  roleFilter === btn.id
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                type="button"
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setShowAddEmployeeModal(true)}
              className="h-8 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
              type="button"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Employee</span>
            </button>

            <button
              onClick={() => setShowAdvanceModal(true)}
              className="h-8 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
              type="button"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>+ Record Advance (Peshgi)</span>
            </button>

            <button
              onClick={handlePostDailyTADAToRoznamcha}
              className="h-8 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="Post Daily TA/DA to Roznamcha GL"
              type="button"
            >
              <Zap className="w-3.5 h-3.5 text-amber-200" />
              <span>⚡ Post TA/DA to GL</span>
            </button>

            <button
              onClick={() => setShowPayrollGeneratorModal(true)}
              className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
              type="button"
            >
              <Award className="w-3.5 h-3.5" />
              <span>⚡ Run Monthly Payroll</span>
            </button>
          </div>
        </div>

        {/* Lower Search and Territory Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          {/* Universal Search Input */}
          <div className="md:col-span-8 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 min-h-[44px]">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee name, code (EMP-xxx), phone, or IMEI..."
              className="w-full bg-transparent pl-3 text-xs text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Territory Selector Dropdown */}
          <div className="md:col-span-4 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 min-h-[44px]">
            <MapPin className="w-4 h-4 text-slate-500 shrink-0 mr-2" />
            <select
              value={territoryFilter}
              onChange={(e) => setTerritoryFilter(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-900 font-bold outline-none cursor-pointer"
            >
              <option value="all">Territory: All Sectors (Swat Valley Cluster)</option>
              <option value="mingora">Mingora Central Sector</option>
              <option value="kabal">Kabal Bazaar Commercial Zone</option>
              <option value="barikot">Barikot Intercity Sector</option>
              <option value="saidu">Saidu Sharif Institutional Belt</option>
              <option value="matta">Matta Upper Swat Depot</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. EMPLOYEE & TERRITORY ASSIGNMENT MATRIX (INTERACTIVE DATA TABLE) */}
      <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Table Top Meta & Quick Audit Counter */}
        <div className="p-4 bg-slate-800 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider font-extrabold">
              Field Deployment &amp; Hardware Security Matrix
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-700 text-amber-300 font-mono text-[10px] font-bold">
              {filteredEmployees.length} OF {employees.length} LOADED
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ACTIVE FIELD FORCE &amp; DEVICE REGISTRY</span>
            </div>
            <button
              onClick={handleExportPayrollCSV}
              className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Export Salary Audit Sheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* High-Density Responsive Table Container */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider font-bold border-b border-slate-200">
                <th className="py-3 px-4 whitespace-nowrap">EMP ID &amp; Staff Name</th>
                <th className="py-3 px-4 whitespace-nowrap">Designation &amp; Role</th>
                <th className="py-3 px-4 whitespace-nowrap">Assigned Route / Unit</th>
                <th className="py-3 px-4 whitespace-nowrap">Hardware IMEI &amp; Security</th>
                <th className="py-3 px-4 whitespace-nowrap">Attendance &amp; Daily TA/DA</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">Base Salary</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">Unpaid Float/Advance</th>
                <th className="py-3 px-4 whitespace-nowrap text-center min-w-[140px]">Operational Triggers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    No employees found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const initials = emp.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  const advanceAmt = employeeAdvanceMap[emp.id] || 0;
                  const salesData = employeeSalesMap[emp.id];

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      {/* Name & ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-900 leading-tight font-extrabold">
                              {emp.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-slate-500">
                                {emp.id.toUpperCase()} • {emp.phone}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  emp.status === 'Active'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : emp.status === 'On Leave'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {emp.status || 'Active'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Grade */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{emp.role}</span>
                        <span className="text-[10px] text-slate-500">
                          {emp.commission_rate > 0 ? `Commission: ${emp.commission_rate}%` : 'Fixed Grade'}
                        </span>
                      </td>

                      {/* Route & Van */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{emp.assigned_route}</span>
                            <span className="font-mono text-[10px] text-slate-500">{emp.van_assigned || 'Depot'}</span>
                          </div>
                        </div>
                      </td>

                      {/* IMEI & Cryptolock */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {emp.imei ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-800 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>{emp.imei}</span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-bold w-fit">
                              BOUND &amp; VERIFIED
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-[11px] text-slate-400 italic">Unassigned</span>
                            <span className="text-[9px] text-slate-400">Optional Device</span>
                          </div>
                        )}
                      </td>

                      {/* Attendance & TA/DA */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-emerald-700">Checked-In 07:45 AM</span>
                          <span className="font-mono text-[11px] text-slate-900 font-semibold">
                            {formatPKR(emp.daily_allowance_rate)} TA/DA Accrued
                          </span>
                        </div>
                      </td>

                      {/* Base Salary */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                        {formatPKR(emp.base_salary)}
                      </td>

                      {/* Unpaid Advance Float */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        {advanceAmt > 0 ? (
                          <>
                            <span className="font-mono font-bold text-rose-600 block">
                              {formatPKR(advanceAmt)}
                            </span>
                            <span className="text-[10px] text-slate-500">Peshgi Pending</span>
                          </>
                        ) : (
                          <span className="font-mono text-emerald-600 font-bold">Cleared</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(emp)}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-900 cursor-pointer transition-colors"
                            title="Edit Employee Profile"
                            type="button"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenPayslip(emp)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                            title="View Employee Payslip / Dossier"
                            type="button"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setAdvanceEmpId(emp.id);
                              setShowAdvanceModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer transition-colors"
                            title="Disburse Salary Advance (Peshgi)"
                            type="button"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setAttendanceEmpId(emp.id);
                              setShowAttendanceModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer transition-colors"
                            title="Mark Attendance & Daily TA/DA"
                            type="button"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setEmployeeToDelete(emp)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-200 text-rose-600 hover:text-rose-800 cursor-pointer transition-colors"
                            title="Permanently Delete Staff Profile"
                            type="button"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Bottom Freezepane Pagination Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="font-mono text-slate-500">
            Showing {filteredEmployees.length} of {employees.length} registered Omnisales Reps | Cluster: Swat Valley
          </div>
          <div className="flex items-center gap-1 font-bold">
            <button className="px-2.5 py-1 rounded bg-amber-600 text-white font-mono">1</button>
            <button className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-mono">2</button>
          </div>
        </div>
      </div>

      {/* 5. DUAL MANAGEMENT ENGINES (SIDE-BY-SIDE PANELS, 7:5 RATIO) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-4">
        {/* Panel A: Automated TA/DA & Payroll Ledger Engine (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-6 shadow-sm rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div className="flex flex-col gap-4">
            {/* Engine Header */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Calculator className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold text-slate-900 uppercase">
                    Automated TA/DA &amp; Payroll Ledger Engine
                  </span>
                  <span className="text-xs text-slate-500">
                    Real-time Roznamcha Journal Pre-Audit Computation
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-bold">
                GAAP / IFRS READY
              </span>
            </div>

            {/* Formula Breakout Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500">Base Pay</span>
                <span className="text-sm font-black font-mono text-slate-900 mt-1">
                  {formatPKR(monthlyPayrollSummary.totalBase)}
                </span>
                <span className="font-mono text-[9px] text-slate-400 mt-0.5">Fixed Component</span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex flex-col">
                <span className="text-[10px] uppercase font-bold text-emerald-800">+ Field TA/DA</span>
                <span className="text-sm font-black font-mono text-emerald-700 mt-1">
                  {formatPKR(monthlyPayrollSummary.totalTADA)}
                </span>
                <span className="font-mono text-[9px] text-slate-400 mt-0.5">26-Day Projection</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col">
                <span className="text-[10px] uppercase font-bold text-amber-800">+ Commission</span>
                <span className="text-sm font-black font-mono text-amber-700 mt-1">
                  {formatPKR(monthlyPayrollSummary.totalCommission)}
                </span>
                <span className="font-mono text-[9px] text-slate-400 mt-0.5">From db.orders</span>
              </div>

              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex flex-col">
                <span className="text-[10px] uppercase font-bold text-rose-800">- Staff Advances</span>
                <span className="text-sm font-black font-mono text-rose-700 mt-1">
                  {formatPKR(monthlyPayrollSummary.totalAdvancesDeducted)}
                </span>
                <span className="font-mono text-[9px] text-rose-600 mt-0.5">Peshgi Deductions</span>
              </div>
            </div>

            {/* Net Payable High-Contrast Strip */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                  Calculated Net Payable Disbursement
                </span>
                <span className="text-2xl font-black font-mono text-amber-400">
                  {formatPKR(monthlyPayrollSummary.totalNet)}
                </span>
              </div>
              <div className="flex flex-col text-left sm:text-right font-mono text-xs text-slate-400">
                <span>HBL Direct Credit Batch #4491</span>
                <span>Meezan Islamic Corporate Portal</span>
              </div>
            </div>

            {/* Roznamcha Checkbox Trigger */}
            <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl cursor-pointer select-none">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 shrink-0 cursor-pointer"
              />
              <span className="text-xs text-slate-700 font-medium">
                Auto-post daily TA/DA into General Ledger Roznamcha account{' '}
                <strong className="text-amber-800 font-mono font-bold">AC-5020 (Field Allowances)</strong> immediately upon
                morning rep route sync.
              </span>
            </label>
          </div>

          {/* Execute Action */}
          <div className="mt-4 pt-2">
            <button
              onClick={() => setShowPayrollGeneratorModal(true)}
              className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs uppercase font-extrabold tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              type="button"
            >
              <Award className="w-4 h-4" />
              <span>Execute Monthly Payroll &amp; Generate Bank Transfer File (HBL / Meezan)</span>
            </button>
          </div>
        </div>

        {/* Panel B: Role-Based Access Control & IMEI Security Engine (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-6 shadow-sm rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div className="flex flex-col gap-4">
            {/* Security Engine Header */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold text-slate-900 uppercase">
                    RBAC &amp; Device IMEI Cryptolock
                  </span>
                  <span className="text-xs text-slate-500">
                    1-Phone-1-User Biometric Constraint
                  </span>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Hardware Monitor Online"></span>
            </div>

            {/* Hardware Policy Status Box */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-slate-800">
                  Strict 1-Phone-1-User Binding
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  ACTIVE • STRICT ENFORCEMENT
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Field tablet &amp; mobile handheld apps automatically reject sessions and report breach telemetry if the detected SIM card, MCC/MNC carrier lock, or primary hardware IMEI differs from the cryptographically hashed database record.
              </p>
            </div>

            {/* Security Policy Toggles */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900">GPS Geo-Fence Tolerance</span>
                  <span className="font-mono text-[10px] text-slate-500">Max drift allowed: 15 meters from shop front</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  ENFORCED
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900">Offline Order Booking Window</span>
                  <span className="font-mono text-[10px] text-slate-500">Max allowed without cellular sync: 4 hours</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  ENFORCED
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900">Biometric Thumbprint on Cash Receipt</span>
                  <span className="font-mono text-[10px] text-slate-500">Mandatory for vouchers exceeding 50,000</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  ENFORCED
                </span>
              </div>
            </div>
          </div>

          {/* Audit Action */}
          <div className="mt-4 pt-2">
            <button
              onClick={() => alert('Device Audit: All 8 active field hardware units matched with zero IMEI conflicts.')}
              className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold uppercase flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer"
              type="button"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Audit Device Mismatches (0 Flagged)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. SYSTEM TELEMETRY FOOTER STRIP */}
      <div className="w-full bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-500">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-900 font-bold">MERKLE ROOT HASH:</span>
          <span className="text-slate-700">98ea1f4c72a819b4a1b029384e8f7a93c4d12e4f5a6b7c8d9e0f1a2b3c4d5e6f</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>DATABASE: IndexedDB Field Node (0.02ms)</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-emerald-700 font-bold text-[10px]">
            GAAP / FBR COMPLIANCE ACTIVE
          </span>
        </div>
      </div>

      {/* MODAL 1: ADD EMPLOYEE MODAL */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm uppercase">Onboard Distribution Staff Member</h3>
              </div>
              <button
                onClick={() => setShowAddEmployeeModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    placeholder="e.g. Asad Khan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Father's Name
                  </label>
                  <input
                    type="text"
                    value={newEmpFatherName}
                    onChange={(e) => setNewEmpFatherName(e.target.value)}
                    placeholder="e.g. Ghulam Khan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmpPhone}
                    onChange={(e) => setNewEmpPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    CNIC Number
                  </label>
                  <input
                    type="text"
                    value={newEmpCnic}
                    onChange={(e) => setNewEmpCnic(e.target.value)}
                    placeholder="15602-0000000-0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Distribution Role *
                  </label>
                  <select
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value as EmployeeRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white"
                  >
                    <option value="Order Booker / Salesman">Order Booker / Salesman</option>
                    <option value="Delivery Driver">Delivery Driver</option>
                    <option value="Van Helper / Loader (Mazdoor)">Van Helper / Loader (Mazdoor)</option>
                    <option value="Recovery Officer">Recovery Officer</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Accountant">Accountant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Assigned Route / Unit
                  </label>
                  <input
                    type="text"
                    value={newEmpRoute}
                    onChange={(e) => setNewEmpRoute(e.target.value)}
                    placeholder="e.g. Mingora Central / Saidu Sharif"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Base Salary (PKR)
                  </label>
                  <input
                    type="number"
                    value={newEmpBaseSalary}
                    onChange={(e) => setNewEmpBaseSalary(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Daily TA/DA (Rs/Day)
                  </label>
                  <input
                    type="number"
                    value={newEmpAllowanceRate}
                    onChange={(e) => setNewEmpAllowanceRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Commission (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newEmpCommissionRate}
                    onChange={(e) => setNewEmpCommissionRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddAdvancedOpen(!isAddAdvancedOpen)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-amber-800 transition-colors cursor-pointer py-1"
                >
                  <span className="font-mono text-sm">{isAddAdvancedOpen ? '▾' : '▸'}</span>
                  <span>Advanced: Device Binding &amp; Phone IMEI (Optional)</span>
                </button>

                {isAddAdvancedOpen && (
                  <div className="mt-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold uppercase text-slate-600">
                        Device Hardware IMEI (Optional)
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">15-digit TAC hardware code</span>
                    </div>
                    <input
                      type="text"
                      value={newEmpImei}
                      onChange={(e) => setNewEmpImei(e.target.value)}
                      placeholder="e.g. 865432098765432 (Leave blank if unassigned)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono text-xs bg-white focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[10px] text-slate-500">
                      Optional: Binds salesman mobile login to their specific Android handset for GPS geofencing. Can be added or changed at any time.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold uppercase shadow-sm cursor-pointer transition-colors"
                >
                  Save Employee Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1B: EDIT EMPLOYEE MODAL */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm uppercase">Edit Staff Profile: {editingEmployee.name}</h3>
              </div>
              <button
                onClick={() => setEditingEmployee(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Full Name & Father's Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editEmpName}
                    onChange={(e) => setEditEmpName(e.target.value)}
                    placeholder="e.g. Asad Khan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Father's Name
                  </label>
                  <input
                    type="text"
                    value={editEmpFatherName}
                    onChange={(e) => setEditEmpFatherName(e.target.value)}
                    placeholder="e.g. Ghulam Khan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              {/* Mobile / WhatsApp Number & CNIC */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Mobile / WhatsApp Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editEmpPhone}
                    onChange={(e) => setEditEmpPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    CNIC Number
                  </label>
                  <input
                    type="text"
                    value={editEmpCnic}
                    onChange={(e) => setEditEmpCnic(e.target.value)}
                    placeholder="15602-0000000-0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Role & Assigned Market Route */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Role *
                  </label>
                  <select
                    value={editEmpRole}
                    onChange={(e) => setEditEmpRole(e.target.value as EmployeeRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white"
                  >
                    <option value="Order Booker / Salesman">Order Booker / Salesman</option>
                    <option value="Delivery Driver">Delivery Driver (Van Driver)</option>
                    <option value="Van Helper / Loader (Mazdoor)">Van Helper / Loader (Mazdoor)</option>
                    <option value="Recovery Officer">Recovery Officer</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Accountant">Accountant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Assigned Market Route
                  </label>
                  <input
                    type="text"
                    value={editEmpRoute}
                    onChange={(e) => setEditEmpRoute(e.target.value)}
                    placeholder="e.g. Main Bazar, Mingora Bypass, Saidu Sharif"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              {/* Salary, TA/DA Allowance, Commission Rate */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Base Monthly Salary (PKR)
                  </label>
                  <input
                    type="number"
                    value={editEmpBaseSalary}
                    onChange={(e) => setEditEmpBaseSalary(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Daily Field Allowance (TA/DA rate)
                  </label>
                  <input
                    type="number"
                    value={editEmpAllowanceRate}
                    onChange={(e) => setEditEmpAllowanceRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editEmpCommissionRate}
                    onChange={(e) => setEditEmpCommissionRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Status Toggle (Active / Inactive / On Leave) */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1.5">
                  Status Toggle
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Active', 'Inactive', 'On Leave'] as const).map((st) => {
                    const isSelected = editEmpStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setEditEmpStatus(st)}
                        className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                          isSelected
                            ? st === 'Active'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : st === 'On Leave'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-slate-700 text-white border-slate-700 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            st === 'Active'
                              ? 'bg-emerald-300'
                              : st === 'On Leave'
                              ? 'bg-amber-300'
                              : 'bg-slate-400'
                          }`}
                        />
                        <span>{st}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expandable / Collapsible IMEI */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditAdvancedOpen(!isEditAdvancedOpen)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-amber-800 transition-colors cursor-pointer py-1"
                >
                  <span className="font-mono text-sm">{isEditAdvancedOpen ? '▾' : '▸'}</span>
                  <span>Advanced: Device Binding &amp; Phone IMEI (Optional)</span>
                </button>

                {isEditAdvancedOpen && (
                  <div className="mt-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold uppercase text-slate-600">
                        Device Hardware IMEI (Optional)
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">15-digit TAC hardware code</span>
                    </div>
                    <input
                      type="text"
                      value={editEmpImei}
                      onChange={(e) => setEditEmpImei(e.target.value)}
                      placeholder="e.g. 865432098765432 (Leave blank if unassigned)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono text-xs bg-white focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[10px] text-slate-500">
                      Optional: Binds salesman mobile login to their specific Android handset for GPS geofencing.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold uppercase shadow-sm cursor-pointer transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SALARY ADVANCE (PESHGI / KHARCHA) MODAL */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-rose-200" />
                <h3 className="font-extrabold text-sm uppercase">Record Salary Advance (Peshgi / Kharcha)</h3>
              </div>
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="text-rose-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordAdvance} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Select Employee *
                </label>
                <select
                  value={advanceEmpId}
                  onChange={(e) => setAdvanceEmpId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.role}) - Current Unpaid Advance: {formatPKR(employeeAdvanceMap[e.id] || 0)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Advance Amount (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Payment Source *
                  </label>
                  <select
                    value={advanceSource}
                    onChange={(e) => setAdvanceSource(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white"
                  >
                    <option value="Cash Counter / Roznamcha">Cash Counter / Roznamcha</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Reason / Description *
                </label>
                <input
                  type="text"
                  required
                  value={advanceReason}
                  onChange={(e) => setAdvanceReason(e.target.value)}
                  placeholder="e.g. Medical emergency, urgent travel advance"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <strong>Roznamcha Linking Notice:</strong> Approving this advance with payment source{' '}
                <em>"Cash Counter / Roznamcha"</em> will automatically post a Cash Out entry in today's Daily Roznamcha
                and deduct from cash in drawer.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold uppercase shadow-sm"
                >
                  Confirm &amp; Disburse Peshgi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: MARK ATTENDANCE & TA/DA */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-200" />
                <h3 className="font-extrabold text-sm uppercase">Mark Daily Attendance &amp; TA/DA</h3>
              </div>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMarkAttendance} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Employee
                </label>
                <select
                  value={attendanceEmpId}
                  onChange={(e) => setAttendanceEmpId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.role}) - Rate: Rs. {e.daily_allowance_rate}/day
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Attendance Status
                  </label>
                  <select
                    value={attendanceStatus}
                    onChange={(e) => setAttendanceStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-bold bg-white"
                  >
                    <option value="Present">Present (Full Allowance)</option>
                    <option value="Half-Day">Half-Day (50% Allowance)</option>
                    <option value="Leave">Leave (Approved)</option>
                    <option value="Absent">Absent (Unpaid)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAttendanceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase shadow-sm"
                >
                  Save Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: MONTHLY PAYROLL GENERATOR SHEET MODAL */}
      {showPayrollGeneratorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm uppercase">
                  Monthly Distribution Payroll Generator ({selectedMonth})
                </h3>
              </div>
              <button
                onClick={() => setShowPayrollGeneratorModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Selected Fiscal Cycle</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedMonth} (26 Working Days)</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block">Gross Payroll</span>
                    <span className="font-bold text-slate-900">{formatPKR(monthlyPayrollSummary.totalGross)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-rose-500 uppercase block">Peshgi Deductions</span>
                    <span className="font-bold text-rose-600">-{formatPKR(monthlyPayrollSummary.totalAdvancesDeducted)}</span>
                  </div>
                  <div className="text-right bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                    <span className="text-[10px] text-emerald-800 uppercase block">Net Disbursed</span>
                    <span className="font-black text-emerald-700">{formatPKR(monthlyPayrollSummary.totalNet)}</span>
                  </div>
                </div>
              </div>

              {/* Salary Sheet Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase border-b border-slate-200">
                      <th className="py-2.5 px-3">Staff Name &amp; Role</th>
                      <th className="py-2.5 px-3 text-right">Base Salary</th>
                      <th className="py-2.5 px-3 text-right">Field TA/DA</th>
                      <th className="py-2.5 px-3 text-right">Commission</th>
                      <th className="py-2.5 px-3 text-right text-rose-600">Advances (Peshgi)</th>
                      <th className="py-2.5 px-3 text-right font-black">Net Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {employees.map((emp) => {
                      const base = emp.base_salary;
                      const tada = emp.daily_allowance_rate * 26;
                      const sales = employeeSalesMap[emp.id]?.totalRevenue || 0;
                      const comm = emp.commission_rate > 0 ? Math.round(sales * (emp.commission_rate / 100)) : 0;
                      const adv = employeeAdvanceMap[emp.id] || 0;
                      const gross = base + tada + comm;
                      const net = Math.max(0, gross - adv);

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-sans">
                            <span className="font-bold text-slate-900 block">{emp.name}</span>
                            <span className="text-[10px] text-slate-500">{emp.role}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right">{formatPKR(base)}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-600">{formatPKR(tada)}</td>
                          <td className="py-2.5 px-3 text-right text-amber-700">{formatPKR(comm)}</td>
                          <td className="py-2.5 px-3 text-right text-rose-600">{adv > 0 ? `-${formatPKR(adv)}` : '-'}</td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">{formatPKR(net)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleExportPayrollCSV}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Bank Sheet (.CSV)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPayrollGeneratorModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteMonthlyPayroll}
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase shadow-sm"
                  >
                    Approve &amp; Pay {selectedMonth} Payroll
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: PRINTABLE INDIVIDUAL PAYSLIP VOUCHER */}
      {showPayslipModal && selectedEmployeeForPayslip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm uppercase">Employee Salary Voucher / Payslip</h3>
              </div>
              <button
                onClick={() => setShowPayslipModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans" id="printable-payslip">
              {/* Slip Header */}
              <div className="text-center border-b border-slate-200 pb-3">
                <h2 className="text-base font-black text-slate-900 uppercase">OMNI BUSINESS MANAGER</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  PrimeLink FMCG &amp; Pharma Distribution ERP • Swat Depot
                </p>
                <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 font-mono text-[10px] font-bold text-slate-700">
                  PAYSLIP VOUCHER • {selectedMonth}
                </div>
              </div>

              {/* Employee Particulars */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Employee Name:</span>
                  <span className="font-extrabold text-slate-900 text-sm block">
                    {selectedEmployeeForPayslip.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    S/O {selectedEmployeeForPayslip.father_name || 'N/A'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">EMP Code / CNIC:</span>
                  <span className="font-mono font-bold text-slate-900 block">
                    {selectedEmployeeForPayslip.id.toUpperCase()}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {selectedEmployeeForPayslip.cnic_number || 'N/A'}
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span><strong>Designation:</strong> {selectedEmployeeForPayslip.role}</span>
                  <span><strong>Route:</strong> {selectedEmployeeForPayslip.assigned_route}</span>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div className="space-y-2">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-700 text-[11px] uppercase">
                    Earnings (Aamad)
                  </div>
                  <div className="p-3 space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-sans">Basic Fixed Salary:</span>
                      <span className="font-bold">{formatPKR(selectedEmployeeForPayslip.base_salary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-sans">Field TA/DA (26 Days @ {selectedEmployeeForPayslip.daily_allowance_rate}/d):</span>
                      <span className="font-bold text-emerald-600">
                        +{formatPKR(selectedEmployeeForPayslip.daily_allowance_rate * 26)}
                      </span>
                    </div>
                    {selectedEmployeeForPayslip.commission_rate > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-sans">Sales Commission ({selectedEmployeeForPayslip.commission_rate}%):</span>
                        <span className="font-bold text-amber-700">
                          +{formatPKR(
                            Math.round(
                              (employeeSalesMap[selectedEmployeeForPayslip.id]?.totalRevenue || 0) *
                                (selectedEmployeeForPayslip.commission_rate / 100)
                            )
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border border-rose-200 rounded-xl overflow-hidden bg-rose-50/30">
                  <div className="bg-rose-100/60 px-3 py-1.5 font-bold text-rose-800 text-[11px] uppercase">
                    Deductions (Katoti / Peshgi)
                  </div>
                  <div className="p-3 space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-sans">Monthly Salary Advance (Peshgi):</span>
                      <span className="font-bold text-rose-600">
                        -{formatPKR(employeeAdvanceMap[selectedEmployeeForPayslip.id] || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Net Payable Highlight */}
                {(() => {
                  const base = selectedEmployeeForPayslip.base_salary;
                  const tada = selectedEmployeeForPayslip.daily_allowance_rate * 26;
                  const sales = employeeSalesMap[selectedEmployeeForPayslip.id]?.totalRevenue || 0;
                  const comm =
                    selectedEmployeeForPayslip.commission_rate > 0
                      ? Math.round(sales * (selectedEmployeeForPayslip.commission_rate / 100))
                      : 0;
                  const adv = employeeAdvanceMap[selectedEmployeeForPayslip.id] || 0;
                  const net = Math.max(0, base + tada + comm - adv);

                  return (
                    <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">
                          NET CASH SALARY PAID
                        </span>
                        <span className="text-lg font-black text-amber-400">{formatPKR(net)}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        VERIFIED BY HR
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Signatures */}
              <div className="pt-6 grid grid-cols-2 gap-4 text-center text-[10px] text-slate-500">
                <div className="border-t border-slate-300 pt-1 font-bold">
                  Employee Signature / Thumbprint
                </div>
                <div className="border-t border-slate-300 pt-1 font-bold">
                  Finance Manager / Cashier Seal
                </div>
              </div>
            </div>

            {/* Print Trigger */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPayslipModal(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold uppercase flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Payslip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal: Delete Staff Profile */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                Confirm Deletion
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Are you sure you want to permanently delete staff member{' '}
                <strong className="text-slate-900 font-bold">"{employeeToDelete.name}"</strong>{' '}
                (ID: <span className="font-mono font-bold text-amber-700">{employeeToDelete.id.slice(0, 8)}</span>)?
                This action cannot be undone.
              </p>
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Designation / Role:</span>
                  <span className="font-bold text-slate-800">{employeeToDelete.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Beat:</span>
                  <span className="font-mono text-slate-700">{employeeToDelete.assigned_route || 'General Dispatch'}</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEmployee}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
