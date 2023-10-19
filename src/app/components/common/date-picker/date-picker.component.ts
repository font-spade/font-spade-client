import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import * as moment from 'moment';
import { ChevronType } from '../../vector/chevron-icon/chevron-icon.component';

@Component({
  selector: 'app-date-picker',
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.css']
})
export class DatePickerComponent implements OnInit {
  MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];
  DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  showDatepicker = false;
  datepickerValue!: string;
  month!: number; // !: mean promis it will not be null, and it will definitely be assigned
  year!: number;
  no_of_days = [] as number[];
  blankdays = [] as number[];
  showYearDropdown = false;

  toggleYearDropdown() {
    this.showYearDropdown = !this.showYearDropdown;
  }

  constructor( private elementRef: ElementRef) {}

  ngOnInit(): void {
    this.initDate();
    this.getNoOfDays();
  }

  initDate() {
    let today = moment();
    this.month = today.month();
    this.year = today.year();

    this.datepickerValue = today.toDate().toDateString();
  }

  isToday(date: any) {
    const today = new Date();
    const d = new Date(this.year, this.month, date);
    return today.toDateString() === d.toDateString() ? true : false;
  }

  getDateValue(date: any) {
    let selectedDate = new Date(this.year, this.month, date);
    this.datepickerValue = selectedDate.toDateString();
    this.showDatepicker = false;
  }

  getNoOfDays() {
    const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();

    // find where to start calendar day of week
    let dayOfWeek = new Date(this.year, this.month).getDay();
    let blankdaysArray = [];
    for (var i = 1; i <= dayOfWeek; i++) {
      blankdaysArray.push(i);
    }

    let daysArray = [];
    for (var i = 1; i <= daysInMonth; i++) {
      daysArray.push(i);
    }

    this.blankdays = blankdaysArray;
    this.no_of_days = daysArray;
  }

  trackByIdentity = (index: number, item: any) => item;
  decrementMonth() {
    if (this.month === 0) {
      // 현재가 1월이면 이전 년도로 이동
      this.month = 11;
      this.year -= 1;
    } else {
      // 그 외의 경우에는 이전 월로 이동
      this.month -= 1;
    }
    this.getNoOfDays();
  }

  incrementMonth() {
    if (this.month === 11) {
      // 현재가 12월이면 다음 년도로 이동
      this.month = 0;
      this.year += 1;
    } else {
      // 그 외의 경우에는 다음 월로 이동
      this.month += 1;
    }
    this.getNoOfDays();
  }

  selectYear(year: number) {
    this.year = year;
    this.showYearDropdown = false;
    this.getNoOfDays();
  }

  getYears(): number[] {
    // 예를 들어, 10년 동안의 년도를 표시하려면 현재 년도 주변의 5년을 표시합니다.
    const years: number[] = [];
    const currentYear = moment().year();
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  }

  // Detect clicks on the document
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      // Click occurred outside the component, close it
      this.showDatepicker = false;
    }
  }
}
