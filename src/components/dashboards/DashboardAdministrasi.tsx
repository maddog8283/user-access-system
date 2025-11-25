import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Users, CreditCard, Search, Filter, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function DashboardAdministrasi() {
  const [payments, setPayments] = useState<any[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "cash",
  });
  
  // Filter states
  const [searchName, setSearchName] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [payments, searchName, filterStatus, startDate, endDate]);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*, patients(*, profiles(full_name))")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setPayments(data);
        const total = data
          .filter((p) => p.status === "completed")
          .reduce((sum, p) => sum + parseFloat(String(p.amount || 0)), 0);
        setTotalRevenue(total);
        
        const pending = data.filter((p) => p.status === "pending").length;
        setPendingCount(pending);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Gagal memuat data pembayaran");
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error("Jumlah pembayaran harus lebih dari Rp 0");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("payments")
        .update({
          amount: parseFloat(paymentForm.amount),
          payment_method: paymentForm.payment_method,
          status: "completed",
          paid_at: new Date().toISOString(),
        })
        .eq("id", selectedPayment.id);

      if (error) throw error;

      toast.success("Pembayaran berhasil diproses!");
      setIsDialogOpen(false);
      setSelectedPayment(null);
      setPaymentForm({ amount: "", payment_method: "cash" });
      fetchPayments();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Gagal memproses pembayaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPaymentDialog = (payment: any) => {
    setSelectedPayment(payment);
    setPaymentForm({
      amount: payment.amount > 0 ? String(payment.amount) : "",
      payment_method: payment.payment_method || "cash",
    });
    setIsDialogOpen(true);
  };

  const applyFilters = () => {
    let filtered = [...payments];

    // Filter by patient name
    if (searchName.trim()) {
      filtered = filtered.filter((payment) =>
        payment.patients?.profiles?.full_name
          ?.toLowerCase()
          .includes(searchName.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((payment) => payment.status === filterStatus);
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(
        (payment) => new Date(payment.created_at) >= startDate
      );
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (payment) => new Date(payment.created_at) <= endOfDay
      );
    }

    setFilteredPayments(filtered);
  };

  const clearFilters = () => {
    setSearchName("");
    setFilterStatus("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasActiveFilters = searchName || filterStatus !== "all" || startDate || endDate;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      pending: "default",
      completed: "secondary",
      cancelled: "outline",
    };
    const labels: Record<string, string> = {
      pending: "Belum Lunas",
      completed: "Lunas",
      cancelled: "Dibatalkan",
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <DashboardLayout title="Dashboard Administrasi">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp {totalRevenue.toLocaleString("id-ID")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pembayaran Pending</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Menunggu proses pembayaran
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Manajemen Pembayaran</CardTitle>
            <CardDescription>Kelola pembayaran pasien</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filter Section */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Filter Pembayaran</h3>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-7 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Hapus Filter
                  </Button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Search by name */}
                <div className="space-y-2">
                  <Label htmlFor="search-name" className="text-xs">
                    Cari Nama Pasien
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search-name"
                      placeholder="Nama pasien..."
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Filter by status */}
                <div className="space-y-2">
                  <Label htmlFor="filter-status" className="text-xs">
                    Status Pembayaran
                  </Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger id="filter-status">
                      <SelectValue placeholder="Semua Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="pending">Belum Lunas</SelectItem>
                      <SelectItem value="completed">Lunas</SelectItem>
                      <SelectItem value="cancelled">Dibatalkan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start date */}
                <div className="space-y-2">
                  <Label className="text-xs">Tanggal Mulai</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        {startDate ? (
                          format(startDate, "dd MMM yyyy", { locale: localeId })
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* End date */}
                <div className="space-y-2">
                  <Label className="text-xs">Tanggal Akhir</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        {endDate ? (
                          format(endDate, "dd MMM yyyy", { locale: localeId })
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        disabled={(date) => startDate ? date < startDate : false}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {hasActiveFilters && (
                <p className="text-xs text-muted-foreground">
                  Menampilkan {filteredPayments.length} dari {payments.length} pembayaran
                </p>
              )}
            </div>

            {/* Payment List */}
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">Tidak ada data pembayaran</p>
                <p className="text-sm text-muted-foreground">
                  Pembayaran akan muncul setelah dokter menyelesaikan pemeriksaan pasien
                </p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">Tidak ada pembayaran yang sesuai filter</p>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Hapus Filter
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{payment.patients?.profiles?.full_name || "Nama tidak tersedia"}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.amount && parseFloat(String(payment.amount)) > 0
                          ? `Rp ${parseFloat(String(payment.amount)).toLocaleString("id-ID")}`
                          : "Jumlah belum ditentukan"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString("id-ID", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        {payment.payment_method && payment.status === "completed" && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <p className="text-xs text-muted-foreground capitalize">
                              {payment.payment_method}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(payment.status)}
                      {payment.status === "pending" && (
                        <Button
                          onClick={() => handleOpenPaymentDialog(payment)}
                          size="sm"
                        >
                          Proses Bayar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Proses Pembayaran</DialogTitle>
              <DialogDescription>
                Pasien: {selectedPayment?.patients?.profiles?.full_name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleProcessPayment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah Pembayaran (Rp) *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="1000"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="Masukkan jumlah pembayaran"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-method">Metode Pembayaran *</Label>
                <Select
                  value={paymentForm.payment_method}
                  onValueChange={(value) =>
                    setPaymentForm({ ...paymentForm, payment_method: value })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="Pilih metode pembayaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Tunai</SelectItem>
                    <SelectItem value="debit">Kartu Debit</SelectItem>
                    <SelectItem value="credit">Kartu Kredit</SelectItem>
                    <SelectItem value="transfer">Transfer Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setPaymentForm({ amount: "", payment_method: "cash" });
                  }}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Memproses..." : "Simpan Pembayaran"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
