export function getActualDate(): string {
    const currentDate = new Date();
  
    const currentHour = currentDate.getHours();
    const currentMinutes = currentDate.getMinutes();
  
    const formattedHour = String(currentHour).padStart(2, '0');
    const formattedMinutes = String(currentMinutes).padStart(2, '0');
  
    const time = formattedHour + ':' + formattedMinutes;
  
    const currentDateOfMonth = currentDate.getDate();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
  
    const formattedDateOfMonth = String(currentDateOfMonth).padStart(2, '0');
    const formattedMonth = String(currentMonth).padStart(2, '0');
  
    const date = formattedDateOfMonth + '/' + formattedMonth + '/' + currentYear + ' - ' + time;
  
    return date;
  }
  
  export function addDays(currentDate: Date, days: number): string {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + days);
      
    const day = newDate.getDate().toString().padStart(2, '0');
    const month = (newDate.getMonth() + 1).toString().padStart(2, '0'); // Month is zero-based
    const year = newDate.getFullYear();
      
    const formattedDate = `${day}/${month}/${year}`;
      
    return formattedDate;
  }
  
  export function formatDate(oldDate: string): Date {
    if (oldDate.length < 0) {
      return new Date();
    }
  
    const dateString = oldDate;
    const parts = dateString.split("/");
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
  
    const formattedDate = new Date(year, month, day);
  
    return formattedDate;
  }
  
  export function remainingDays(currentDate: Date, expirationDate: string): number {
    const expirationDateParts = expirationDate.split('/');
    const expiration = new Date(
      parseInt(expirationDateParts[2], 10),
      parseInt(expirationDateParts[1], 10) - 1,
      parseInt(expirationDateParts[0], 10)
    );
  
    const difference = expiration.getTime() - currentDate.getTime();
  
    const daysRemaining = Math.ceil(difference / (1000 * 60 * 60 * 24));
  
    return daysRemaining > 0 ? daysRemaining : 0;
  }