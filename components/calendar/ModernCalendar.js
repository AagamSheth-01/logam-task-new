/**
 * Modern Calendar Component
 * Clean implementation without hardcoded festivals, using real API data
 */

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, Plus } from 'lucide-react';

const ModernCalendar = ({
  tasks = [],
  onTaskClick,
  onDateClick,
  userRole = 'user',
  viewMode = 'month',
  onViewModeChange
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);


  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Week days for header
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get calendar dates for month view
  const getCalendarDates = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const dates = [];
    for (let i = 0; i < 42; i++) {
      dates.push(new Date(startDate));
      startDate.setDate(startDate.getDate() + 1);
    }
    return dates;
  };

  // Get week dates for week view
  const getWeekDates = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(startOfWeek));
      startOfWeek.setDate(startOfWeek.getDate() + 1);
    }
    return dates;
  };

  // Get tasks for a specific date
  const getTasksForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(task => {
      if (!task.deadline && !task.start) return false;
      const taskDate = task.deadline || task.start;
      const taskDateStr = new Date(taskDate).toISOString().split('T')[0];
      return taskDateStr === dateStr;
    });
  };

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if date is selected
  const isSelected = (date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  // Check if date is in current month
  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth;
  };

  // Handle date click
  const handleDateClick = (date) => {
    setSelectedDate(date);
    if (onDateClick) {
      onDateClick(date);
    }
  };

  // Handle navigation
  const navigateCalendar = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  // Get view title
  const getViewTitle = () => {
    if (viewMode === 'month') {
      return `${monthNames[currentMonth]} ${currentYear}`;
    } else if (viewMode === 'week') {
      const weekDates = getWeekDates();
      const start = weekDates[0];
      const end = weekDates[6];
      if (start.getMonth() === end.getMonth()) {
        return `${monthNames[start.getMonth()]} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
      } else {
        return `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`;
      }
    } else {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  const calendarDates = viewMode === 'month' ? getCalendarDates() : getWeekDates();

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {getViewTitle()}
          </h3>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateCalendar(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Today
            </button>

            <button
              onClick={() => navigateCalendar(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {['month', 'week', 'day'].map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange && onViewModeChange(mode)}
              className={`px-3 py-1 text-sm rounded-md transition-colors capitalize ${
                viewMode === mode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Body */}
      <div className="p-4">
        {viewMode === 'month' && (
          <MonthView
            weekDays={weekDays}
            calendarDates={calendarDates}
            isCurrentMonth={isCurrentMonth}
            isToday={isToday}
            isSelected={isSelected}
            getTasksForDate={getTasksForDate}
            handleDateClick={handleDateClick}
            onTaskClick={onTaskClick}
          />
        )}

        {viewMode === 'week' && (
          <WeekView
            weekDays={weekDays}
            weekDates={getWeekDates()}
            isToday={isToday}
            isSelected={isSelected}
            getTasksForDate={getTasksForDate}
            handleDateClick={handleDateClick}
            onTaskClick={onTaskClick}
          />
        )}

        {viewMode === 'day' && (
          <DayView
            selectedDate={currentDate}
            tasks={getTasksForDate(currentDate)}
            onTaskClick={onTaskClick}
            isToday={isToday(currentDate)}
          />
        )}

      </div>
    </div>
  );
};

// Month View Component
const MonthView = ({
  weekDays,
  calendarDates,
  isCurrentMonth,
  isToday,
  isSelected,
  getTasksForDate,
  handleDateClick,
  onTaskClick
}) => (
  <div>
    {/* Week day headers */}
    <div className="grid grid-cols-7 gap-1 mb-2">
      {weekDays.map(day => (
        <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 uppercase">
          {day}
        </div>
      ))}
    </div>

    {/* Calendar grid */}
    <div className="grid grid-cols-7 gap-1">
      {calendarDates.map((date, index) => {
        const dayTasks = getTasksForDate(date);
        const isCurrentMonthDate = isCurrentMonth(date);
        const isTodayDate = isToday(date);
        const isSelectedDate = isSelected(date);

        return (
          <CalendarDate
            key={index}
            date={date}
            tasks={dayTasks}
            isCurrentMonth={isCurrentMonthDate}
            isToday={isTodayDate}
            isSelected={isSelectedDate}
            onClick={() => handleDateClick(date)}
            onTaskClick={onTaskClick}
          />
        );
      })}
    </div>
  </div>
);

// Week View Component
const WeekView = ({
  weekDays,
  weekDates,
  isToday,
  isSelected,
  getTasksForDate,
  handleDateClick,
  onTaskClick
}) => {
  const [weekMoreTooltips, setWeekMoreTooltips] = React.useState({});
  const [weekTaskTooltips, setWeekTaskTooltips] = React.useState({});

  const handleWeekMoreHover = (dayIndex, show) => {
    setWeekMoreTooltips(prev => ({ ...prev, [dayIndex]: show }));
  };

  const handleWeekTaskHover = (dayIndex, taskIndex, show) => {
    const key = `${dayIndex}-${taskIndex}`;
    setWeekTaskTooltips(prev => ({ ...prev, [key]: show }));
  };

  return (
  <div>
    {/* Week headers */}
    <div className="grid grid-cols-7 gap-2 mb-4">
      {weekDays.map((day, index) => {
        const date = weekDates[index];
        const isTodayDate = isToday(date);
        const isSelectedDate = isSelected(date);

        return (
          <div
            key={day}
            className={`text-center p-2 rounded-lg cursor-pointer transition-colors ${
              isTodayDate ? 'bg-blue-100 text-blue-800' :
              isSelectedDate ? 'bg-gray-100 text-gray-900' :
              'text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => handleDateClick(date)}
          >
            <div className="text-xs font-medium uppercase">{day}</div>
            <div className="text-lg font-semibold">{date.getDate()}</div>
          </div>
        );
      })}
    </div>

    {/* Week tasks */}
    <div className="grid grid-cols-7 gap-2">
      {weekDates.map((date, index) => {
        const dayTasks = getTasksForDate(date);
        return (
          <div key={index} className="min-h-32 border border-gray-200 rounded-lg p-2">
            <div className="space-y-1">
              {dayTasks.slice(0, 3).map((task, taskIndex) => {
                const taskTitle = task.title || task.task || 'Untitled Task';
                const tooltipKey = `${index}-${taskIndex}`;

                return (
                  <div
                    key={taskIndex}
                    onClick={() => onTaskClick && onTaskClick(task)}
                    onMouseEnter={() => handleWeekTaskHover(index, taskIndex, true)}
                    onMouseLeave={() => handleWeekTaskHover(index, taskIndex, false)}
                    className={`text-xs p-1 rounded cursor-pointer transition-colors truncate relative ${
                      task.type === 'task' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                      task.type === 'holiday' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                      'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                    title={taskTitle}
                  >
                    {taskTitle}

                    {/* Hover Tooltip for Week View */}
                    {weekTaskTooltips[tooltipKey] && (
                      <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-[9999] min-w-max shadow-2xl border border-gray-700 animate-in fade-in duration-200">
                        <div className="font-medium">{taskTitle}</div>
                        {task.deadline && task.type === 'task' && (
                          <div className="text-xs text-gray-300 mt-1">
                            Due: {new Date(task.deadline).toLocaleDateString()}
                          </div>
                        )}
                        {task.type && (
                          <div className="text-xs text-gray-400 mt-1 capitalize">
                            {task.type === 'holiday' ? 'Holiday' : task.type === 'festival' ? 'Festival' : 'Task'}
                          </div>
                        )}
                        {/* Arrow */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
                      </div>
                    )}
                  </div>
                );
              })}
              {dayTasks.length > 3 && (
                <div
                  className="text-xs text-gray-500 relative cursor-pointer"
                  title={`${dayTasks.length - 3} more tasks: ${dayTasks.slice(3).map(t => t.title || t.task || 'Untitled Task').join(', ')}`}
                  onMouseEnter={() => handleWeekMoreHover(index, true)}
                  onMouseLeave={() => handleWeekMoreHover(index, false)}
                >
                  +{dayTasks.length - 3} more

                  {/* Tooltip for additional tasks in week view */}
                  {weekMoreTooltips[index] && (
                    <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg z-[9999] min-w-max max-w-48 shadow-2xl border border-gray-700 animate-in fade-in duration-200">
                    <div className="font-medium mb-2">{dayTasks.length - 3} more:</div>
                    <div className="space-y-1">
                      {dayTasks.slice(3).map((task, idx) => (
                        <div key={idx} className="text-xs text-gray-300 flex items-start">
                          <span className="text-gray-400 mr-2">•</span>
                          <div>
                            <div className="font-medium">{task.title || task.task || 'Untitled Task'}</div>
                            {task.type && (
                              <div className="text-gray-400 capitalize text-[10px]">
                                {task.type === 'holiday' ? 'Holiday' : task.type === 'festival' ? 'Festival' : 'Task'}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                      {/* Arrow */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
  );
};

// Day View Component
const DayView = ({ selectedDate, tasks, onTaskClick, isToday }) => (
  <div className="space-y-4">
    <div className={`text-center p-4 rounded-lg ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
      <div className="text-2xl font-bold">
        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
    </div>

    <div className="space-y-2">
      {tasks.length > 0 ? (
        tasks.map((task, index) => (
          <div
            key={index}
            onClick={() => onTaskClick && onTaskClick(task)}
            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{task.title || task.task || 'Untitled Task'}</span>
            </div>
            {task.deadline && (
              <div className="text-sm text-gray-500 mt-1">
                Due: {new Date(task.deadline).toLocaleTimeString()}
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No tasks for this date</p>
        </div>
      )}
    </div>
  </div>
);

// Calendar Date Component
const CalendarDate = ({
  date,
  tasks,
  isCurrentMonth,
  isToday,
  isSelected,
  onClick,
  onTaskClick
}) => {
  const [showMoreTooltip, setShowMoreTooltip] = React.useState(false);
  const [taskTooltips, setTaskTooltips] = React.useState({});

  const handleTaskHover = (taskIndex, show) => {
    setTaskTooltips(prev => ({ ...prev, [taskIndex]: show }));
  };

  return (
    <div
      onClick={onClick}
      className={`
        min-h-20 p-1 border border-gray-200 rounded-lg cursor-pointer transition-colors relative
        ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white hover:bg-gray-50'}
        ${isToday ? 'border-blue-500 bg-blue-50' : ''}
        ${isSelected ? 'border-gray-500 bg-gray-100' : ''}
      `}
    >
      <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>
        {date.getDate()}
      </div>

      <div className="space-y-1 mt-1">
        {tasks.slice(0, 2).map((task, index) => {
          const taskTitle = task.title || task.task || 'Untitled Task';

          return (
            <div
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                onTaskClick && onTaskClick(task);
              }}
              onMouseEnter={() => handleTaskHover(index, true)}
              onMouseLeave={() => handleTaskHover(index, false)}
              className={`text-xs p-1 rounded truncate cursor-pointer transition-colors relative ${
                task.type === 'task' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                task.type === 'holiday' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
              title={taskTitle}
            >
              {taskTitle}

              {/* Hover Tooltip */}
              {taskTooltips[index] && (
                <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-[9999] min-w-max shadow-2xl border border-gray-700 animate-in fade-in duration-200">
                  <div className="font-medium">{taskTitle}</div>
                {task.deadline && task.type === 'task' && (
                  <div className="text-xs text-gray-300 mt-1">
                    Due: {new Date(task.deadline).toLocaleDateString()}
                  </div>
                )}
                {task.type && (
                  <div className="text-xs text-gray-400 mt-1 capitalize">
                    {task.type === 'holiday' ? 'Holiday' : task.type === 'festival' ? 'Festival' : 'Task'}
                  </div>
                )}
                  {/* Arrow */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
                </div>
              )}
            </div>
          );
        })}
        {tasks.length > 2 && (
          <div
            className="text-xs text-gray-500 relative cursor-pointer"
            title={`${tasks.length - 2} more tasks: ${tasks.slice(2).map(t => t.title || t.task || 'Untitled Task').join(', ')}`}
            onMouseEnter={() => setShowMoreTooltip(true)}
            onMouseLeave={() => setShowMoreTooltip(false)}
          >
            +{tasks.length - 2}

            {/* Tooltip for additional tasks */}
            {showMoreTooltip && (
              <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg z-[9999] min-w-max max-w-64 shadow-2xl border border-gray-700 animate-in fade-in duration-200">
              <div className="font-medium mb-2">{tasks.length - 2} more items:</div>
              <div className="space-y-1">
                {tasks.slice(2).map((task, idx) => (
                  <div key={idx} className="text-xs text-gray-300 flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <div>
                      <div className="font-medium">{task.title || task.task || 'Untitled Task'}</div>
                      {task.type && (
                        <div className="text-gray-400 capitalize text-[10px]">
                          {task.type === 'holiday' ? 'Holiday' : task.type === 'festival' ? 'Festival' : 'Task'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
                {/* Arrow */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Selected Date Tasks Component
const SelectedDateTasks = ({ date, tasks, onTaskClick }) => (
  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
    <h4 className="font-medium text-gray-900 mb-3">
      Tasks for {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
    </h4>

    {tasks.length > 0 ? (
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <div
            key={index}
            onClick={() => onTaskClick && onTaskClick(task)}
            className="p-2 bg-white border border-gray-200 rounded cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="font-medium">{task.title || task.task || 'Untitled Task'}</div>
            {task.deadline && (
              <div className="text-sm text-gray-500">
                Due: {new Date(task.deadline).toLocaleTimeString()}
              </div>
            )}
          </div>
        ))}
      </div>
    ) : (
      <div className="text-center py-4 text-gray-500">
        <Calendar className="w-6 h-6 mx-auto mb-2 text-gray-400" />
        <p>No tasks for this date</p>
      </div>
    )}
  </div>
);

export default ModernCalendar;