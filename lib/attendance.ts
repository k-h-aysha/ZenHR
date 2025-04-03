import { supabase } from './supabase';
import { PostgrestError } from '@supabase/supabase-js';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  first_clock_in: string;
  last_clock_out: string | null;
  num_clock_ins: number;
  total_hours_worked: string | null;
}

export interface AttendanceError {
  message: string;
}

// Helper function to calculate time difference
const calculateTimeDifference = (startTime: string, endTime: string): string => {
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  const diff = end.getTime() - start.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Add time values (HH:MM:SS format)
const addTimes = (time1: string, time2: string): string => {
  const [h1, m1, s1] = time1.split(':').map(Number);
  const [h2, m2, s2] = time2.split(':').map(Number);
  
  let totalSeconds = s1 + s2;
  let totalMinutes = m1 + m2;
  let totalHours = h1 + h2;
  
  if (totalSeconds >= 60) {
    totalMinutes += Math.floor(totalSeconds / 60);
    totalSeconds %= 60;
  }
  
  if (totalMinutes >= 60) {
    totalHours += Math.floor(totalMinutes / 60);
    totalMinutes %= 60;
  }
  
  return `${totalHours.toString().padStart(2, '0')}:${totalMinutes.toString().padStart(2, '0')}:${totalSeconds.toString().padStart(2, '0')}`;
};

// Get current time in HH:mm:ss format
const getCurrentTime = (): string => {
  return new Date().toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Get current date in YYYY-MM-DD format
const getCurrentDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Clock In function
export const clockIn = async (employeeId: string): Promise<AttendanceRecord | AttendanceError> => {
  try {
    console.log('Starting clock in for employee:', employeeId);
    const currentDate = getCurrentDate();
    const currentTime = getCurrentTime();

    console.log('Current date:', currentDate, 'Current time:', currentTime);
    console.log('Employee ID type:', typeof employeeId, 'Value:', employeeId);
    
    if (!employeeId || employeeId.trim() === '') {
      throw new Error('Invalid employee ID: Empty or null');
    }
    
    // First verify if the user exists in the database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', employeeId)
      .single();
      
    if (userError) {
      console.error('Error verifying user existence:', userError);
      throw new Error(`User with ID ${employeeId} not found in the database`);
    }
    
    if (!userData) {
      throw new Error(`User with ID ${employeeId} does not exist`);
    }
    
    console.log('User verification successful:', userData);
    
    // Check if attendance record exists for today
    const { data: existingRecord, error: fetchError } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', currentDate)
      .single();

    console.log('Fetch result:', existingRecord, fetchError);

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching attendance record:', fetchError);
      throw fetchError;
    }

    if (existingRecord) {
      console.log('Updating existing record for employee:', employeeId);
      // Update existing record for subsequent clock-ins
      const { data, error } = await supabase
        .from('attendance')
        .update({
          num_clock_ins: existingRecord.num_clock_ins + 1,
          first_clock_in: currentTime
        })
        .eq('id', existingRecord.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating attendance record:', error);
        throw error;
      }
      console.log('Successfully updated record:', data);
      return data;
    } else {
      console.log('Creating new record for employee:', employeeId);

      // Try inserting with RPC first for more detailed error messages
      try {
        // Direct approach with minimal operations
        const newRecord = {
          employee_id: employeeId,
          date: currentDate,
          first_clock_in: currentTime,
          num_clock_ins: 1,
          total_hours_worked: '00:00:00'
        };
        
        console.log('New record to insert:', newRecord);
        
        // Try the insert
        const { data, error } = await supabase
          .from('attendance')
          .insert(newRecord)
          .select()
          .single();

        if (error) {
          console.error('Insert error with detail:', error);
          throw error;
        }
        
        console.log('Successfully created new record:', data);
        return data;
      } catch (insertError) {
        console.error('Failed to insert record, trying alternative approach:', insertError);
        
        // If first approach fails, try a more direct SQL approach
        const { data: simpleInsertData, error: simpleInsertError } = await supabase
          .from('attendance')
          .insert({
            employee_id: employeeId,
            date: currentDate,
            first_clock_in: currentTime,
            num_clock_ins: 1,
            total_hours_worked: '00:00:00'
          });
          
        if (simpleInsertError) {
          console.error('Simple insert also failed:', simpleInsertError);
          throw simpleInsertError;
        }
        
        // Get the new record since we didn't use .select() in the insert
        const { data: newRecord, error: fetchNewError } = await supabase
          .from('attendance')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('date', currentDate)
          .single();
          
        if (fetchNewError) {
          console.error('Error fetching newly created record:', fetchNewError);
          throw fetchNewError;
        }
        
        console.log('Successfully created record (alternative method):', newRecord);
        return newRecord;
      }
    }
  } catch (error) {
    console.error('Clock in error:', error);
    return {
      message: error instanceof Error ? error.message : 'Failed to clock in'
    };
  }
};

// Clock Out function
export const clockOut = async (employeeId: string): Promise<AttendanceRecord | AttendanceError> => {
  try {
    console.log('Starting clock out for employee:', employeeId);
    const currentDate = getCurrentDate();
    const currentTime = getCurrentTime();

    // Get today's attendance record
    const { data: record, error: fetchError } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', currentDate)
      .single();

    console.log('Fetch result for clock out:', record, fetchError);

    if (fetchError) {
      console.error('Error fetching attendance record for clock out:', fetchError);
      throw fetchError;
    }
    
    if (!record) {
      console.error('No active attendance record found');
      throw new Error('No active attendance record found');
    }

    // Calculate hours worked in this session
    const sessionHoursWorked = calculateTimeDifference(record.first_clock_in, currentTime);
    console.log('Session hours worked:', sessionHoursWorked);
    
    // Add to existing total hours worked
    const totalHoursWorked = record.total_hours_worked 
      ? addTimes(record.total_hours_worked, sessionHoursWorked) 
      : sessionHoursWorked;
    
    console.log('Total hours worked:', totalHoursWorked);

    // Update the record
    const updateData = {
      last_clock_out: currentTime,
      total_hours_worked: totalHoursWorked,
    };
    
    console.log('Update data for clock out:', updateData);
    
    const { data, error } = await supabase
      .from('attendance')
      .update(updateData)
      .eq('id', record.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating attendance record for clock out:', error);
      throw error;
    }
    
    console.log('Successfully clocked out:', data);
    return data;
  } catch (error) {
    console.error('Clock out error:', error);
    return {
      message: error instanceof Error ? error.message : 'Failed to clock out'
    };
  }
};

// Resume clock in after a previous clock out
export const resumeClockIn = async (employeeId: string): Promise<AttendanceRecord | AttendanceError> => {
  try {
    console.log('Starting resume clock in for employee:', employeeId);
    const currentDate = getCurrentDate();
    const currentTime = getCurrentTime();

    // Get today's attendance record
    const { data: record, error: fetchError } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', currentDate)
      .single();

    console.log('Fetch result for resume clock in:', record, fetchError);

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching attendance record for resume clock in:', fetchError);
      throw fetchError;
    }
    
    if (!record) {
      console.log('No existing record found, creating new one');
      // If no record found, create a new one
      return await clockIn(employeeId);
    }

    // Update first_clock_in to current time for this session and increment num_clock_ins
    // Preserve the existing total_hours_worked value
    const updateData = {
      first_clock_in: currentTime,
      num_clock_ins: record.num_clock_ins + 1,
      // Set last_clock_out to null to indicate the user is clocked in now
      last_clock_out: null
      // total_hours_worked is preserved from the previous session
    };
    
    console.log('Update data for resume clock in:', updateData);
    
    const { data, error } = await supabase
      .from('attendance')
      .update(updateData)
      .eq('id', record.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating attendance record for resume clock in:', error);
      throw error;
    }
    
    console.log('Successfully resumed clock in:', data);
    return data;
  } catch (error) {
    console.error('Resume clock in error:', error);
    return {
      message: error instanceof Error ? error.message : 'Failed to resume clock in'
    };
  }
};

// Get today's attendance record
export const getTodayAttendance = async (employeeId: string): Promise<AttendanceRecord | null> => {
  try {
    console.log('Getting today\'s attendance for employee:', employeeId);
    const currentDate = getCurrentDate();
    
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', currentDate)
      .single();

    console.log('Get today attendance result:', data, error);

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('No record found for today');
        return null; // No record found
      }
      console.error('Error getting today\'s attendance:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    return null;
  }
};

// Finalize day's attendance before midnight
export const finalizeDayAttendance = async (employeeId: string): Promise<AttendanceRecord | null> => {
  try {
    console.log('Finalizing day attendance for employee:', employeeId);
    const currentDate = getCurrentDate();
    const currentTime = getCurrentTime();
    
    // Get today's attendance record
    const { data: record, error: fetchError } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', currentDate)
      .single();

    console.log('Fetch result for finalize day attendance:', record, fetchError);

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.log('No record found for finalizing');
        return null; // No record found
      }
      console.error('Error fetching record for finalizing:', fetchError);
      throw fetchError;
    }
    
    if (!record) return null;
    
    // If user is still clocked in, calculate final hours
    if (!record.last_clock_out) {
      // Calculate hours worked in final session
      const sessionHoursWorked = calculateTimeDifference(record.first_clock_in, currentTime);
      console.log('Final session hours worked:', sessionHoursWorked);
      
      // Add to existing total hours worked
      const totalHoursWorked = record.total_hours_worked 
        ? addTimes(record.total_hours_worked, sessionHoursWorked) 
        : sessionHoursWorked;
      
      console.log('Final total hours worked:', totalHoursWorked);

      // Update with final calculations
      const updateData = {
        last_clock_out: '23:59:59',
        total_hours_worked: totalHoursWorked,
      };
      
      console.log('Update data for finalize day:', updateData);
      
      const { data, error } = await supabase
        .from('attendance')
        .update(updateData)
        .eq('id', record.id)
        .select()
        .single();

      if (error) {
        console.error('Error finalizing day attendance:', error);
        throw error;
      }
      
      console.log('Successfully finalized day attendance:', data);
      return data;
    }
    
    return record;
  } catch (error) {
    console.error('Error finalizing day attendance:', error);
    return null;
  }
};

// Reset attendance for new day (called at midnight)
export const resetAttendanceForNewDay = async (): Promise<void> => {
  try {
    console.log('Resetting attendance for new day');
    // First finalize all open records
    const { data: activeRecords, error: fetchError } = await supabase
      .from('attendance')
      .select('employee_id')
      .is('last_clock_out', null);
      
    console.log('Active records for reset:', activeRecords, fetchError);
      
    if (fetchError) {
      console.error('Error fetching active records for reset:', fetchError);
      throw fetchError;
    }
    
    if (activeRecords && activeRecords.length > 0) {
      console.log(`Finalizing ${activeRecords.length} active records`);
      for (const record of activeRecords) {
        await finalizeDayAttendance(record.employee_id);
      }
    } else {
      console.log('No active records to finalize');
    }
  } catch (error) {
    console.error('Error resetting attendance for new day:', error);
  }
};

// Test database operations function - can be called manually for testing
export const testDatabaseOperations = async (): Promise<void> => {
  try {
    console.log('Testing database operations...');
    
    // Test 1: Check connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1);
    
    if (connectionError) {
      console.error('Connection test failed:', connectionError);
    } else {
      console.log('Connection test successful:', connectionTest);
    }
    
    // First get a valid user ID from users table
    const { data: userIdData, error: userIdError } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();
      
    if (userIdError) {
      console.error('Failed to get a valid user ID:', userIdError);
      return;
    }
    
    if (!userIdData || !userIdData.id) {
      console.error('No user IDs found in the database');
      return;
    }
    
    const validUserId = userIdData.id;
    console.log('Found valid user ID for testing:', validUserId);
    
    // Test 2: Try direct insert to attendance table with valid user ID
    const testRecord = {
      employee_id: validUserId,
      date: getCurrentDate(),
      first_clock_in: getCurrentTime(),
      num_clock_ins: 1,
      total_hours_worked: '00:00:00'
    };
    
    console.log('Attempting to insert test record:', testRecord);
    
    const { data: insertTest, error: insertError } = await supabase
      .from('attendance')
      .insert(testRecord)
      .select();
    
    if (insertError) {
      console.error('Insert test failed:', insertError);
    } else {
      console.log('Insert test successful:', insertTest);
      
      // Test 3: Clean up test record
      const { error: deleteError } = await supabase
        .from('attendance')
        .delete()
        .eq('id', insertTest[0].id);
      
      if (deleteError) {
        console.error('Delete test failed:', deleteError);
      } else {
        console.log('Delete test successful');
      }
    }
  } catch (error) {
    console.error('Test database operations failed:', error);
  }
}; 