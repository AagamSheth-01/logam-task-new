import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, Flag, Plus, Star, Heart, Sparkles } from 'lucide-react';

// Comprehensive Festival Database - All Major Festivals
const FESTIVALS = {
  // JANUARY
  '2025-01-01': [{ name: 'New Year\'s Day', type: 'international', color: 'bg-purple-500' }],
  '2025-01-14': [
    { name: 'Makar Sankranti', type: 'hindu', color: 'bg-orange-500' },
    { name: 'Lohri', type: 'regional', color: 'bg-yellow-500' }
  ],
  '2025-01-15': [{ name: 'Pongal (Tamil)', type: 'regional', color: 'bg-yellow-600' }],
  '2025-01-16': [{ name: 'Thiruvalluvar Day', type: 'regional', color: 'bg-blue-400' }],
  '2025-01-23': [{ name: 'Netaji Subhas Chandra Bose Jayanti', type: 'national', color: 'bg-green-600' }],
  '2025-01-26': [{ name: 'Republic Day', type: 'national', color: 'bg-green-500' }],
  
  // FEBRUARY
  '2025-02-04': [{ name: 'Vasant Panchami', type: 'hindu', color: 'bg-yellow-500' }],
  '2025-02-14': [{ name: 'Valentine\'s Day', type: 'international', color: 'bg-red-500' }],
  '2025-02-19': [{ name: 'Chhatrapati Shivaji Maharaj Jayanti', type: 'regional', color: 'bg-orange-600' }],
  '2025-02-26': [{ name: 'Maha Shivratri', type: 'hindu', color: 'bg-blue-500' }],
  
  // MARCH
  '2025-03-08': [{ name: 'International Women\'s Day', type: 'international', color: 'bg-pink-600' }],
  '2025-03-13': [{ name: 'Holi', type: 'hindu', color: 'bg-pink-500' }],
  '2025-03-14': [{ name: 'Dhulandi/Rangwali Holi', type: 'hindu', color: 'bg-pink-400' }],
  '2025-03-30': [{ name: 'Ram Navami', type: 'hindu', color: 'bg-orange-500' }],
  
  // APRIL
  '2025-04-01': [{ name: 'April Fool\'s Day', type: 'international', color: 'bg-yellow-400' }],
  '2025-04-06': [{ name: 'Mahavir Jayanti', type: 'jain', color: 'bg-orange-400' }],
  '2025-04-13': [{ name: 'Baisakhi/Vaisakhi', type: 'sikh', color: 'bg-orange-500' }],
  '2025-04-14': [{ name: 'Ambedkar Jayanti', type: 'national', color: 'bg-blue-600' }],
  '2025-04-18': [{ name: 'Good Friday', type: 'christian', color: 'bg-purple-600' }],
  '2025-04-20': [{ name: 'Easter Sunday', type: 'christian', color: 'bg-purple-400' }],
  
  // MAY
  '2025-05-01': [{ name: 'Labour Day/May Day', type: 'national', color: 'bg-red-600' }],
  '2025-05-12': [{ name: 'Buddha Purnima', type: 'buddhist', color: 'bg-yellow-600' }],
  '2025-05-11': [{ name: 'Mother\'s Day', type: 'international', color: 'bg-pink-500' }],
  
  // JUNE
  '2025-06-02': [{ name: 'Rath Yatra', type: 'hindu', color: 'bg-orange-600' }],
  '2025-06-15': [{ name: 'Father\'s Day', type: 'international', color: 'bg-blue-500' }],
  '2025-06-21': [{ name: 'International Yoga Day', type: 'international', color: 'bg-green-400' }],
  
  // JULY
  '2025-07-04': [{ name: 'Guru Purnima', type: 'hindu', color: 'bg-orange-500' }],
  '2025-07-17': [{ name: 'Muharram', type: 'islamic', color: 'bg-green-600' }],
  
  // AUGUST
  '2025-08-15': [{ name: 'Independence Day', type: 'national', color: 'bg-green-600' }],
  '2025-08-16': [{ name: 'Janmashtami', type: 'hindu', color: 'bg-blue-600' }],
  '2025-08-27': [{ name: 'Ganesh Chaturthi', type: 'hindu', color: 'bg-orange-500' }],
  
  // SEPTEMBER
  '2025-09-05': [{ name: 'Teachers\' Day', type: 'national', color: 'bg-blue-500' }],
  '2025-09-07': [{ name: 'Anant Chaturdashi', type: 'hindu', color: 'bg-orange-400' }],
  '2025-09-15': [{ name: 'Anant Chaturdashi', type: 'hindu', color: 'bg-red-500' }],
  
  // OCTOBER
  '2025-10-02': [{ name: 'Gandhi Jayanti', type: 'national', color: 'bg-green-500' }],
  '2025-10-12': [{ name: 'Dussehra/Vijayadashami', type: 'hindu', color: 'bg-orange-500' }],
  '2025-10-20': [{ name: 'Karva Chauth', type: 'hindu', color: 'bg-red-500' }],
  '2025-10-31': [{ name: 'Halloween', type: 'international', color: 'bg-orange-600' }],
  
  // NOVEMBER
  '2025-11-01': [{ name: 'Diwali/Deepavali', type: 'hindu', color: 'bg-yellow-500' }],
  '2025-11-02': [{ name: 'Govardhan Puja', type: 'hindu', color: 'bg-yellow-400' }],
  '2025-11-03': [{ name: 'Bhai Dooj', type: 'hindu', color: 'bg-orange-300' }],
  '2025-11-15': [{ name: 'Guru Nanak Jayanti', type: 'sikh', color: 'bg-orange-500' }],
  
  // DECEMBER
  '2025-12-25': [{ name: 'Christmas', type: 'christian', color: 'bg-red-500' }],
  '2025-12-31': [{ name: 'New Year\'s Eve', type: 'international', color: 'bg-purple-500' }],
  
  // ADDITIONAL RECURRING FESTIVALS (Dynamic dates - these would need calculation)
  // Note: Some festivals have lunar calendar dates that change yearly
};

// Button component
const Button = ({ children, onClick, variant = 'default', size = 'md', className = '', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    default: 'bg-black text-white hover:bg-gray-800 focus:ring-black',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

// Fixed date utility functions
const isValidDate = (date) => {
  if (!date) return false;
  try {
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
  } catch (error) {
    return false;
  }
};

const toISODateString = (date) => {
  if (!date) return null;
  
  try {
    let dateObj;
    
    if (typeof date === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return null;
    }
    
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('Error converting date to ISO string:', error);
    return null;
  }
};

const isTaskOverdue = (task) => {
  if (!task || !task.deadline || task.status === 'done') return false;
  
  if (!isValidDate(task.deadline)) {
    console.warn(`Invalid deadline for task: ${task.task}`, task.deadline);
    return false;
  }
  
  try {
    const taskDateStr = toISODateString(task.deadline);
    const todayStr = toISODateString(new Date());
    
    if (!taskDateStr || !todayStr) return false;
    
    return taskDateStr < todayStr;
  } catch (error) {
    console.warn(`Error checking if task is overdue: ${task.task}`, error);
    return false;
  }
};

const getTasksForDateSafe = (tasks, targetDate) => {
  if (!Array.isArray(tasks) || !isValidDate(targetDate)) return [];
  
  const targetDateStr = toISODateString(targetDate);
  if (!targetDateStr) return [];
  
  return tasks.filter(task => {
    if (!task || !task.deadline) return false;
    
    const taskDateStr = toISODateString(task.deadline);
    return taskDateStr === targetDateStr;
  });
};

// Get festivals for a specific date
const getFestivalsForDate = (date) => {
  const dateStr = toISODateString(date);
  return FESTIVALS[dateStr] || [];
};

const isToday = (date) => {
  const todayStr = toISODateString(new Date());
  const dateStr = toISODateString(date);
  return todayStr === dateStr;
};

// Festival icon component
const FestivalIcon = ({ type }) => {
  const iconClass = "w-3 h-3";
  
  if (type === 'national') {
    return React.createElement(Flag, { className: iconClass });
  }
  if (type === 'hindu' || type === 'sikh' || type === 'buddhist') {
    return React.createElement(Star, { className: iconClass });
  }
  if (type === 'christian') {
    return React.createElement(Heart, { className: iconClass });
  }
  if (type === 'international') {
    return React.createElement(Sparkles, { className: iconClass });
  }
  return React.createElement(Star, { className: iconClass });
};

const CalendarComponent = ({ tasks = [], onTaskClick, onDateClick, onCreateTask, userRole = 'user', showFestivals = true }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState('month');
  const [festivalFilter, setFestivalFilter] = useState('all');

  const today = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Generate calendar days
  const getCalendarDates = (date) => {
    try {
      const year = date.getFullYear();
      const month = date.getMonth();
      
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      
      const dates = [];
      const currentDateIter = new Date(startDate);
      
      for (let i = 0; i < 42; i++) {
        dates.push(new Date(currentDateIter));
        currentDateIter.setDate(currentDateIter.getDate() + 1);
      }
      
      return dates;
    } catch (error) {
      console.warn('Error generating calendar dates:', error);
      return [];
    }
  };

  const calendarDays = getCalendarDates(currentDate);

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      High: 'bg-red-500',
      Medium: 'bg-yellow-500',
      Low: 'bg-green-500'
    };
    return colors[priority] || 'bg-gray-500';
  };

  // Get status color
  const getStatusColor = (status) => {
    return status === 'done' ? 'bg-green-500' : 'bg-yellow-500';
  };

  // Check if date is in current month
  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth;
  };

  // Navigation functions
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentMonth + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(today);
  };

  // Format date for display
  const formatDate = (date) => {
    try {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Filter festivals based on selected filter
  const filterFestivals = (festivals) => {
    if (festivalFilter === 'all') return festivals;
    return festivals.filter(festival => festival.type === festivalFilter);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-lg">
      {/* Calendar Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-black flex items-center space-x-2">
              <Calendar className="w-6 h-6" />
              <span>Calendar</span>
            </h2>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth(-1)}
                className="p-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="text-lg font-semibold text-black min-w-[200px] text-center">
                {monthNames[currentMonth]} {currentYear}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth(1)}
                className="p-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
            >
              Today
            </Button>
            {userRole === 'admin' && (
              <Button
                size="sm"
                onClick={() => onCreateTask && onCreateTask()}
                className="bg-black hover:bg-gray-800 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Task</span>
              </Button>
            )}
          </div>
        </div>

        {/* View Toggle and Festival Filter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            {['month', 'week', 'day'].map((viewType) => (
              <button
                key={viewType}
                onClick={() => setView(viewType)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors capitalize ${
                  view === viewType 
                    ? 'bg-white text-black shadow-sm' 
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                {viewType}
              </button>
            ))}
          </div>
          
          {showFestivals && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Festivals:</span>
              <select
                value={festivalFilter}
                onChange={(e) => setFestivalFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="all">All Festivals</option>
                <option value="national">National</option>
                <option value="hindu">Hindu</option>
                <option value="christian">Christian</option>
                <option value="sikh">Sikh</option>
                <option value="buddhist">Buddhist</option>
                <option value="islamic">Islamic</option>
                <option value="jain">Jain</option>
                <option value="regional">Regional</option>
                <option value="international">International</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Body */}
      <div className="p-6">
        {view === 'month' && (
          <div>
            {/* Week Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                const dayTasks = getTasksForDateSafe(tasks, date);
                const dayFestivals = showFestivals ? filterFestivals(getFestivalsForDate(date)) : [];
                const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                const isTodayDate = isToday(date);
                
                return (
                  <div
                    key={index}
                    onClick={() => {
                      setSelectedDate(date);
                      onDateClick && onDateClick(date);
                    }}
                    className={`
                      min-h-[120px] p-2 border border-gray-100 rounded-lg cursor-pointer transition-colors
                      ${isTodayDate ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}
                      ${isSelected ? 'bg-black text-white' : ''}
                      ${!isCurrentMonth(date) ? 'opacity-50' : ''}
                    `}
                  >
                    <div className={`text-sm font-medium mb-1 ${isSelected ? 'text-white' : isTodayDate ? 'text-blue-600' : 'text-black'}`}>
                      {date.getDate()}
                    </div>
                    
                    {/* Festivals */}
                    {showFestivals && dayFestivals.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {dayFestivals.slice(0, 2).map((festival, festivalIndex) => (
                          <div
                            key={festivalIndex}
                            className={`
                              text-xs p-1 rounded flex items-center space-x-1
                              ${isSelected ? 'bg-white text-black' : festival.color + ' text-white'}
                            `}
                            title={festival.name}
                          >
                            <FestivalIcon type={festival.type} />
                            <span className="truncate">{festival.name}</span>
                          </div>
                        ))}
                        {dayFestivals.length > 2 && (
                          <div className={`text-xs ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                            +{dayFestivals.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Tasks for this date */}
                    <div className="space-y-1">
                      {dayTasks.slice(0, 2).map((task, taskIndex) => (
                        <div
                          key={taskIndex}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskClick && onTaskClick(task);
                          }}
                          className={`
                            text-xs p-1 rounded cursor-pointer truncate
                            ${isSelected ? 'bg-white text-black' : getStatusColor(task.status) + ' text-white'}
                            ${isTaskOverdue(task) && task.status !== 'done' ? 'bg-red-500 text-white' : ''}
                          `}
                          title={task.task}
                        >
                          <div className="flex items-center space-x-1">
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
                            <span className="truncate">{task.task}</span>
                          </div>
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className={`text-xs ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                          +{dayTasks.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'week' && (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Week view coming soon...</p>
          </div>
        )}

        {view === 'day' && (
          <div>
            {selectedDate ? (
              <div>
                <h3 className="text-lg font-semibold text-black mb-4">
                  {formatDate(selectedDate)}
                </h3>
                
                {/* Festivals for selected date */}
                {showFestivals && getFestivalsForDate(selectedDate).length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-black mb-2 flex items-center space-x-2">
                      <Star className="w-4 h-4" />
                      <span>Festivals</span>
                    </h4>
                    <div className="space-y-2">
                      {filterFestivals(getFestivalsForDate(selectedDate)).map((festival, index) => (
                        <div
                          key={index}
                          className={`flex items-center space-x-3 p-3 rounded-lg ${festival.color} text-white`}
                        >
                          <FestivalIcon type={festival.type} />
                          <div>
                            <h5 className="font-medium">{festival.name}</h5>
                            <p className="text-sm opacity-90 capitalize">{festival.type} festival</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Tasks for selected date */}
                <div>
                  <h4 className="text-md font-medium text-black mb-2">Tasks</h4>
                  <div className="space-y-3">
                    {getTasksForDateSafe(tasks, selectedDate).map((task, index) => (
                      <div
                        key={index}
                        onClick={() => onTaskClick && onTaskClick(task)}
                        className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
                          <div>
                            <h4 className="font-medium text-black">{task.task}</h4>
                            <p className="text-sm text-gray-500">
                              Assigned to: {task.assigned_to} • Priority: {task.priority}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            task.status === 'done' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                          }`}>
                            {task.status}
                          </span>
                          {isTaskOverdue(task) && task.status !== 'done' && (
                            <span className="text-red-500 text-xs">Overdue</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {getTasksForDateSafe(tasks, selectedDate).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No tasks scheduled for this day</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Select a date to view daily tasks and festivals</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Date Info */}
      {selectedDate && view === 'month' && (
        <div className="border-t border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-black mb-3">
            {formatDate(selectedDate)}
          </h3>
          
          {/* Festivals */}
          {showFestivals && getFestivalsForDate(selectedDate).length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-black mb-2 flex items-center space-x-2">
                <Star className="w-4 h-4" />
                <span>Festivals</span>
              </h4>
              <div className="space-y-2">
                {filterFestivals(getFestivalsForDate(selectedDate)).map((festival, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-2 p-2 rounded-md ${festival.color} text-white text-sm`}
                  >
                    <FestivalIcon type={festival.type} />
                    <span>{festival.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Tasks */}
          <div>
            <h4 className="text-sm font-medium text-black mb-2">Tasks</h4>
            <div className="space-y-2">
              {getTasksForDateSafe(tasks, selectedDate).map((task, index) => (
                <div
                  key={index}
                  onClick={() => onTaskClick && onTaskClick(task)}
                  className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
                    <div>
                      <h4 className="font-medium text-black text-sm">{task.task}</h4>
                      <p className="text-xs text-gray-500">
                        {task.assigned_to} • {task.priority}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    task.status === 'done' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    {task.status}
                  </span>
                </div>
              ))}
              {getTasksForDateSafe(tasks, selectedDate).length === 0 && (
                <p className="text-gray-500 text-sm">No tasks scheduled for this day</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarComponent;