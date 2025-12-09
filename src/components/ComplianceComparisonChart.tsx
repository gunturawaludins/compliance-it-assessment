import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell, PieChart, Pie, LineChart, Line } from 'recharts';
import { DanaPensiunComplianceData } from '@/lib/multiExcelParser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, TrendingUp, BarChart3, Target, Award, AlertTriangle } from 'lucide-react';

interface ComplianceComparisonChartProps {
  data: DanaPensiunComplianceData[];
}

const COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#7c3aed', '#db2777', '#65a30d'];
const ASPECT_COLORS = {
  A: '#dc2626',
  B: '#ea580c', 
  C: '#0891b2',
  D: '#16a34a'
};

export function ComplianceComparisonChart({ data }: ComplianceComparisonChartProps) {
  // Prepare data for overall compliance comparison
  const overallComparisonData = useMemo(() => {
    return data.map((dp, index) => ({
      name: dp.danaPensiun.length > 20 ? dp.danaPensiun.substring(0, 17) + '...' : dp.danaPensiun,
      fullName: dp.danaPensiun,
      compliance: dp.overallComplianceScore,
      fill: COLORS[index % COLORS.length]
    })).sort((a, b) => b.compliance - a.compliance);
  }, [data]);

  // Prepare data for aspect comparison (stacked bar) - B and C swapped
  const aspectComparisonData = useMemo(() => {
    return data.map((dp) => ({
      name: dp.danaPensiun.length > 15 ? dp.danaPensiun.substring(0, 12) + '...' : dp.danaPensiun,
      fullName: dp.danaPensiun,
      'Aspek A': dp.aspectStats.find(s => s.aspect === 'A')?.complianceRate || 0,
      'Aspek B': dp.aspectStats.find(s => s.aspect === 'C')?.complianceRate || 0, // Swapped: use C data
      'Aspek C': dp.aspectStats.find(s => s.aspect === 'B')?.complianceRate || 0, // Swapped: use B data
      'Aspek D': dp.aspectStats.find(s => s.aspect === 'D')?.complianceRate || 0,
    }));
  }, [data]);

  // Prepare radar data for each Dana Pensiun - B and C swapped
  const radarData = useMemo(() => {
    const aspectMapping: Record<string, string> = { 'A': 'A', 'B': 'C', 'C': 'B', 'D': 'D' }; // Swap B and C
    return ['A', 'B', 'C', 'D'].map(aspect => {
      const result: Record<string, string | number> = { 
        aspect: `Aspek ${aspect}` 
      };
      data.forEach((dp) => {
        const stat = dp.aspectStats.find(s => s.aspect === aspectMapping[aspect]);
        result[dp.danaPensiun] = stat?.complianceRate || 0;
      });
      return result;
    });
  }, [data]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const scores = data.map(d => d.overallComplianceScore);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const highestDP = data.find(d => d.overallComplianceScore === highest);
    const lowestDP = data.find(d => d.overallComplianceScore === lowest);
    
    return { average, highest, lowest, highestDP, lowestDP };
  }, [data]);

  // Distribution data for pie chart
  const distributionData = useMemo(() => {
    const excellent = data.filter(d => d.overallComplianceScore >= 80).length;
    const good = data.filter(d => d.overallComplianceScore >= 60 && d.overallComplianceScore < 80).length;
    const poor = data.filter(d => d.overallComplianceScore < 60).length;
    
    return [
      { name: 'Excellent (≥80%)', value: excellent, fill: '#16a34a' },
      { name: 'Good (60-79%)', value: good, fill: '#ca8a04' },
      { name: 'Needs Improvement (<60%)', value: poor, fill: '#dc2626' },
    ].filter(d => d.value > 0);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Upload file Excel untuk melihat perbandingan compliance</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{data.length}</p>
                <p className="text-xs text-muted-foreground">Dana Pensiun</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{summaryStats.average.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Rata-rata Compliance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Award className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{summaryStats.highest}%</p>
                <p className="text-xs text-muted-foreground truncate" title={summaryStats.highestDP?.danaPensiun}>
                  {summaryStats.highestDP?.danaPensiun.substring(0, 20)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{summaryStats.lowest}%</p>
                <p className="text-xs text-muted-foreground truncate" title={summaryStats.lowestDP?.danaPensiun}>
                  {summaryStats.lowestDP?.danaPensiun.substring(0, 20)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="bar" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="bar">Bar Chart</TabsTrigger>
          <TabsTrigger value="aspect">Per Aspek</TabsTrigger>
          <TabsTrigger value="radar">Radar</TabsTrigger>
          <TabsTrigger value="distribution">Distribusi</TabsTrigger>
        </TabsList>
        
        <TabsContent value="bar">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Perbandingan Skor Compliance Keseluruhan
              </CardTitle>
              <CardDescription>
                Ranking Dana Pensiun berdasarkan skor compliance keseluruhan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overallComparisonData} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value}%`, 'Compliance']}
                      labelFormatter={(label) => overallComparisonData.find(d => d.name === label)?.fullName || label}
                    />
                    <Bar dataKey="compliance" radius={[0, 4, 4, 0]}>
                      {overallComparisonData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.compliance >= 80 ? '#16a34a' : entry.compliance >= 60 ? '#ca8a04' : '#dc2626'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="aspect">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Perbandingan Per Aspek COBIT
              </CardTitle>
              <CardDescription>
                Compliance rate per aspek untuk setiap Dana Pensiun
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aspectComparisonData} margin={{ left: 20, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value}%`]}
                    />
                    <Legend />
                    <Bar dataKey="Aspek A" fill={ASPECT_COLORS.A} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Aspek B" fill={ASPECT_COLORS.B} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Aspek C" fill={ASPECT_COLORS.C} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Aspek D" fill={ASPECT_COLORS.D} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="radar">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Radar Compliance Per Aspek
              </CardTitle>
              <CardDescription>
                Visualisasi multidimensi compliance setiap Dana Pensiun
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="aspect" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value}%`]}
                    />
                    <Legend />
                    {data.map((dp, index) => (
                      <Radar
                        key={dp.danaPensiun}
                        name={dp.danaPensiun.length > 20 ? dp.danaPensiun.substring(0, 17) + '...' : dp.danaPensiun}
                        dataKey={dp.danaPensiun}
                        stroke={COLORS[index % COLORS.length]}
                        fill={COLORS[index % COLORS.length]}
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="distribution">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Distribusi Tingkat Compliance
              </CardTitle>
              <CardDescription>
                Kategori Dana Pensiun berdasarkan tingkat compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={130}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detailed Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Detail Compliance Per Dana Pensiun</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Dana Pensiun</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Overall</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Aspek A</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Aspek B</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Aspek C</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Aspek D</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">PIC</th>
                </tr>
              </thead>
              <tbody>
                {data.sort((a, b) => b.overallComplianceScore - a.overallComplianceScore).map((dp) => (
                  <tr key={dp.danaPensiun} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-3 px-2 font-medium text-foreground">{dp.danaPensiun}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                        dp.overallComplianceScore >= 80 ? 'bg-success/20 text-success' :
                        dp.overallComplianceScore >= 60 ? 'bg-warning/20 text-warning' :
                        'bg-destructive/20 text-destructive'
                      }`}>
                        {dp.overallComplianceScore}%
                      </span>
                    </td>
                    {['A', 'B', 'C', 'D'].map(aspect => {
                      // Swap B and C data
                      const mappedAspect = aspect === 'B' ? 'C' : aspect === 'C' ? 'B' : aspect;
                      const stat = dp.aspectStats.find(s => s.aspect === mappedAspect);
                      const rate = stat?.complianceRate || 0;
                      return (
                        <td key={aspect} className="py-3 px-2 text-center">
                          <span className={`text-sm ${
                            rate >= 80 ? 'text-success' :
                            rate >= 60 ? 'text-warning' :
                            'text-destructive'
                          }`}>
                            {rate}%
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-3 px-2 text-muted-foreground">{dp.pic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
