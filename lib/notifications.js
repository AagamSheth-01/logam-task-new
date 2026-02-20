import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Button from '../components/ui/Button';
import { 
  BarChart3, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Home, 
  UserPlus, 
  List, 
  TrendingUp, 
  FileText, 
  LogOut,
  Calendar,
  Flag,
  Users,
  Download,
  Shield
} from 'lucide-react';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [allTasks, setAllTasks] = useState([]);
  const [summary, setSummary] = useState({ total: 0, completed: 0, pending: 0, overdue: 0 });
  const [performance, setPerformance] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState('');
  const [newTask, setNewTask] = useState({
    task: '',
    assigned_to: '',
    deadline: '',
    priority: 'Medium'
  });
  const [users, setUsers] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role?.toLowerCase() !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setUser(parsedUser);
    loadDashboardData(token);
    loadUsers(token);
  }, [router]);

  const loadDashboardData = async (token) => {
    try {
      setLoading(true);
      
      // Load all tasks
      const tasksResponse = await fetch('/api/tasks?all=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tasksData = await tasksResponse.json();
      
      if (tasksData.success) {
        setAllTasks(tasksData.tasks);
        
        // Calculate summary
        const total = tasksData.tasks.length;
        const completed = tasksData.tasks.filter(t => t.status === 'done').length;
        const pending = total - completed;
        const overdue = tasksData.tasks.filter(t => {
          if (t.status === 'pending' && t.deadline) {
            return new Date(t.deadline) < new Date();
          }
          return false;
        }).length;
        
        setSummary({ total, completed, pending, overdue });
        
        // Calculate performance data
        const perfData = {};
        tasksData.tasks.forEach(task => {
          const user = task.assigned_to;
          if (!user) return;
          
          if (!perfData[user]) {
            perfData[user] = { total: 0, completed: 0, pending: 0 };
          }
          
          perfData[user].total++;
          if (task.status === 'done') {
            perfData[user].completed++;
          } else {
            perfData[user].pending++;
          }
        });
        
        setPerformance(perfData);
      }
      
    } catch (error) {
      setError('Failed to load dashboard data');
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (token) => {
    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        setNewTask(prev => ({ ...prev, assigned_to: data.users[0]?.username || '' }));
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleCreateTask = async () => {
    if (!newTask.task || !newTask.assigned_to || !newTask.deadline) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newTask)
      });

      const data = await response.json();
      if (data.success) {
        setNewTask({ task: '', assigned_to: users[0]?.username || '', deadline: '', priority: 'Medium' });
        loadDashboardData(token);
        setError('');
        alert('Task assigned successfully!');
      } else {
        setError(data.message || 'Failed to create task');
      }
    } catch (error) {
      setError('Failed to create task');
    }
  };

  const generateReport = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Create report data
      const reportData = {
        generated_on: new Date().toISOString(),
        summary: summary,
        performance: performance,
        all_tasks: allTasks,
        users: users.length
      };
      
      // Create and download report
      const reportContent = JSON.stringify(reportData, null, 2);
      const blob = new Blob([reportContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Report generated and downloaded successfully!');
    } catch (error) {
      setError('Failed to generate report');
    }
  };

  const getStatusColor = (status) => {
    return status === 'done' ? 'text-green-600 bg-green-50 border-green-200' : 'text-amber-600 bg-amber-50 border-amber-200';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      High: 'text-red-600 bg-red-50 border-red-200',
      Medium: 'text-amber-600 bg-amber-50 border-amber-200',
      Low: 'text-green-600 bg-green-50 border-green-200'
    };
    return colors[priority] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'High') return <Flag className="w-3 h-3 text-red-600" />;
    if (priority === 'Medium') return <Flag className="w-3 h-3 text-amber-600" />;
    return <Flag className="w-3 h-3 text-green-600" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'assign-task', label: 'Assign Task', icon: UserPlus },
    { id: 'all-tasks', label: 'All Tasks', icon: List },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  const statsCards = [
    { label: 'Total', value: summary.total, icon: BarChart3, color: 'text-black' },
    { label: 'Completed', value: summary.completed, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Pending', value: summary.pending, icon: Clock, color: 'text-amber-600' },
    { label: 'Overdue', value: summary.overdue, icon: AlertTriangle, color: 'text-red-600' }
  ];

  return (
    <>
      <Head>
        <title>Admin Console - Logam Task Manager</title>
      </Head>
      
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b border-gray-100 bg-white">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Logam Academy Logo */}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
                    <img src="/icons/Logam Academy LOGO 512x512.png" alt="Logam Academy Logo" className="w-8 h-8 object-contain" />
                  </div>
                  <Shield className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-black">Admin Console</h1>
                  <p className="text-sm text-gray-600">Welcome, {user?.username} • System Administrator</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">Administrator</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 bg-white border-r border-gray-100 min-h-screen">
            <nav className="p-4">
              <div className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        activeTab === item.id
                          ? 'bg-black text-white'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {/* System Overview */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-black mb-3 flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>System Overview</span>
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <List className="w-3 h-3 text-gray-600" />
                      <span className="text-gray-600">Tasks</span>
                    </div>
                    <span className="font-semibold text-black">{summary.total}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Users className="w-3 h-3 text-gray-600" />
                      <span className="text-gray-600">Users</span>
                    </div>
                    <span className="font-semibold text-black">{users.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <span className="text-gray-600">Completion</span>
                    </div>
                    <span className="font-semibold text-green-600">
                      {summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-black">Dashboard</h2>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {statsCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="bg-white border border-gray-100 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">{stat.label}</p>
                            <p className="text-2xl font-bold text-black mt-1">{stat.value}</p>
                          </div>
                          <Icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Team Performance */}
                <div className="bg-white border border-gray-100 rounded-lg">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5" />
                      <span>Team Performance</span>
                    </h3>
                  </div>
                  <div className="p-6">
                    {Object.keys(performance).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(performance).map(([username, data]) => {
                          const completionRate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
                          return (
                            <div key={username} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                              <div className="flex-1">
                                <h4 className="font-medium text-black text-sm">{username}</h4>
                                <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                                  <span>Total: {data.total}</span>
                                  <span>Completed: {data.completed}</span>
                                  <span>Pending: {data.pending}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-lg font-bold ${completionRate >= 80 ? 'text-green-600' : completionRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                  {completionRate}%
                                </div>
                                <div className="text-xs text-gray-500">completion</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No performance data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Assign Task Tab */}
            {activeTab === 'assign-task' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-black">Assign Task</h2>
                <div className="bg-white border border-gray-100 rounded-lg p-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">Task Description</label>
                      <textarea
                        value={newTask.task}
                        onChange={(e) => setNewTask({...newTask, task: e.target.value})}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
                        rows={3}
                        placeholder="Enter task description..."
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">Assign To</label>
                        <select
                          value={newTask.assigned_to}
                          onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value})}
                          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
                        >
                          <option value="">Select user...</option>
                          {users.map((u) => (
                            <option key={u.username} value={u.username}>{u.username} ({u.role})</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">Priority</label>
                        <select
                          value={newTask.priority}
                          onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
                        >
                          <option value="High">High Priority</option>
                          <option value="Medium">Medium Priority</option>
                          <option value="Low">Low Priority</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">Deadline</label>
                        <input
                          type="date"
                          value={newTask.deadline}
                          onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
                          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button onClick={handleCreateTask} className="bg-black hover:bg-gray-800 flex items-center space-x-2 cursor-pointer">
                        <UserPlus className="w-4 h-4" />
                        <span>Create Task</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* All Tasks Tab */}
            {activeTab === 'all-tasks' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-black">All Tasks</h2>
                <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Task</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Assigned To</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Deadline</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Assigned By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {allTasks.map((task, index) => (
                          <tr key={index} className="hover:bg-gray-50 cursor-pointer">
                            <td className="px-6 py-4 text-sm font-medium text-black">{task.task}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{task.assigned_to}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{task.deadline}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 border rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                                {task.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 border rounded text-xs font-medium flex items-center space-x-1 w-fit ${getPriorityColor(task.priority)}`}>
                                {getPriorityIcon(task.priority)}
                                <span>{task.priority}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{task.given_by}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Tab */}
            {activeTab === 'performance' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-black">Performance Analytics</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {Object.entries(performance).map(([username, data]) => {
                    const completionRate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
                    return (
                      <div key={username} className="bg-white border border-gray-100 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
                          <Users className="w-5 h-5" />
                          <span>{username}</span>
                        </h3>
                        
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-black">{data.total}</div>
                            <div className="text-sm text-gray-500">Total</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{data.completed}</div>
                            <div className="text-sm text-gray-500">Completed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-amber-600">{data.pending}</div>
                            <div className="text-sm text-gray-500">Pending</div>
                          </div>
                        </div>
                        
                        <div className="mb-2">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Completion Rate</span>
                            <span>{completionRate}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${completionRate >= 80 ? 'bg-green-500' : completionRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${completionRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-black">Reports & Analytics</h2>
                <div className="bg-white border border-gray-100 rounded-lg p-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
                        <FileText className="w-5 h-5" />
                        <span>Performance Report</span>
                      </h3>
                      <p className="text-gray-600 mb-4 text-sm">
                        Generate a comprehensive performance report including all tasks, user statistics, and system metrics.
                      </p>
                      <Button onClick={generateReport} className="bg-black hover:bg-gray-800 flex items-center space-x-2 cursor-pointer">
                        <Download className="w-4 h-4" />
                        <span>Generate Report</span>
                      </Button>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-6">
                      <h3 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5" />
                        <span>System Statistics</span>
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-black">{users.length}</div>
                          <div className="text-sm text-gray-500">Total Users</div>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-black">{summary.total}</div>
                          <div className="text-sm text-gray-500">Total Tasks</div>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0}%
                          </div>
                          <div className="text-sm text-gray-500">Avg Completion</div>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-red-600">{summary.overdue}</div>
                          <div className="text-sm text-gray-500">Overdue Tasks</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}