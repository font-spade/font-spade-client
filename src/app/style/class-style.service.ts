import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ClassStyleService {
  title = 'lg:text-4xl text-2xl mb-5 pt-14'
  conTxtCls = 'text-lg mt-1'
  conH1 = 'pt-8 mb-4 text-3xl'
  conH2 = 'pt-4 mb-2 text-2xl'
  img = 'flex flex-col items-center rounded-[20px] bg-gray-50 p-4 mt-8 mb-8 text-gray-300 lg:p-6 lg:drop-shadow-lg lg:shadow-md'
  constructor() { }
}
