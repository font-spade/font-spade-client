import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter, Inject,
  OnInit,
  Output, QueryList, Renderer2,
  ViewChildren,
  ViewContainerRef
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Cmyk, ColorPickerService } from 'ngx-color-picker';
import { fabric } from 'fabric';
import { document } from 'postcss';
import * as FontFaceObserver from 'fontfaceobserver';
import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-emoji-text',
  templateUrl: './emoji-text.component.html',
  styleUrls: ['./emoji-text.component.css']
})
export class EmojiTextComponent implements OnInit, AfterViewInit {
  // Parameters
  text: string | null = null;
  align: string = 'center';
  sizeFixed: boolean = false;
  nonStretch: boolean = false;
  publicFg: boolean = true;
  selectedImageId: number | null = null;


  canvas = null;
  // Font
  // fonts = FONTS[getLocale()];
  fonts: FamilyInfo[] = [];
  fontKey: string = '';

  // Colors
  colorKind: string = 'foreground';
  colors = DEFAULT_COLORS.hex;
  backgroundColors = DEFAULT_BACKGROUND_COLORS;
  presetColors = PRESET_COLORS;
  backgroundPresetColors = BACKGROUND_PRESET_COLORS;

  @Output() change: EventEmitter<string> = new EventEmitter<string>();
  //////////////////////////////////////////////////////////////////////

  // URL
  queryString: string | null = null;

  // Parameters
  color: string | null = null;
  queryLocale: string | null = null;

  // Browser extension
  browser = {name: '', version: ''};
  browserExtensionEnabled: boolean = false;

  visibleResult: boolean = false;
  visibleRegister: boolean = false;
  visibleShare: boolean = false;
  toggle: boolean = false;
  foreBackState: string = 'foreground'
  @ViewChildren('fontItem') fontItems: QueryList<ElementRef>;


  emitChange() {
    this.change.emit(this.colorKind);
  }
  constructor(
    // 추후 구현해야함.
    // private eventbus: any,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    public vcRef: ViewContainerRef,
    private cpService: ColorPickerService,
    private httpClient: HttpClient,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {
    // this.eventbus.on('EG_LOCALE_CHANGED', (locale) => {
    //   // this.fonts = FONTS[locale];
    //   // this.fontKey = FONTS[locale][0].key;
    //   this.text = 'Generator.parameter_text_default_value';
    // });

    this.text = 'Generator.parameter_text_default_value';
  }
  public onEventLog(event: string, data: any): void {
    console.log(event, data);
  }

  loadFontAndApplyStyle() {
    debugger;
    // 스크립트 동적 삽입
    const script = this.renderer.createElement('script');
    script.type = 'module';
    script.src = 'https://8fl3k30sy0.execute-api.ap-northeast-2.amazonaws.com/v1/api/js/drop_fontstream_js/?sid=gAAAAABlar1l_CDANjMPlUyDAciq0ebr8GNIsft3xwZBl0jQMNCqJiwaWySGGeNcm5q-wXD2_hzuceO0MmdbplBMgLKaYfnUkp4op1j9vLD9RX1pFf6Jy9vvxai13RDcwFRxffejW_Wi6_E7lEhai-KIbHibmHknopjJpCls80napWisAB4WwHsU5eXaNcor0zUcDIUWRzDqqkKlsUaQgriWKnk45YLckdOrGMxmsxbpn1RAP_e3IsdrD9prvpe23XzFWFlspuuZ';
    script.charset = 'utf-8';
    this.renderer.appendChild(this.document.head, script);

    // 폰트 로딩 완료 후 스타일 적용
    script.onload = () => {
      this.applyFontStyle();
    };
  }

  applyFontStyle() {
    // 특정 HTML 요소에 스타일 적용 (예: id가 'target-element'인 요소)
    const targetElement = this.document.getElementById('target-element');
    if (targetElement) {

      targetElement.style.fontFamily = 'SD PixelGoodmorning';
      targetElement.style.fontWeight = '400';
    }
  }

  public onChangeColor(color: string): void {
    console.log('Color changed:', color);
  }

  public onChangeColorCmyk(color: string): Cmyk {
    const hsva = this.cpService.stringToHsva(color);

    if (hsva) {
      const rgba = this.cpService.hsvaToRgba(hsva);

      return this.cpService.rgbaToCmyk(rgba);
    }

    return new Cmyk(0, 0, 0, 0);
  }

  public onChangeColorHex8(color: string): string {
    const hsva = this.cpService.stringToHsva(color, true);

    if (hsva) {
      return this.cpService.outputFormat(hsva, 'rgba', null);
    }

    return '';
  }

  generate() {
    const color = this.colorsToRgbaHex(this.colors);
    const backgroundColors = this.colorsToRgbaHex(this.backgroundColors);

    const query = {
      text: this.text,
      color: color,
      back_color: backgroundColors,
      font: this.fontKey,
      size_fixed: this.sizeFixed,
      align: this.align,
      stretch: !this.nonStretch,
      public_fg: this.publicFg,
      locale: 'ko',
    };

    // this.eventbus.emit('EG_EMOJI_GENERATE', query);
    // this.router.navigate([toLoccalizedPath('/result')], { queryParams: query });

    // const scroller = new SweetScroll({ easing: 'easeOutQuad' });
    // scroller.toTop(0);
  }

  colorsToRgbaHex(colors: any): string {
    if (colors.hex) {
      const rgb = colors.hex.replace(/#/, '');
      const alphaInt = Math.floor(colors.a * 0xff) & 0xff;
      const alpha = ('0' + alphaInt.toString(16)).slice(-2).toUpperCase();
      return rgb + alpha;
    }
    return DEFAULT_BACKGROUND_COLOR_HEX;
  }

  colorKindChanged(value: string) {
    this.colorKind = value;
  }

  ngOnInit (): void {
    // Initial state
    if (this.router.url.match(/^(?:\/[a-zA-Z-]+)?\/result/)) {
      this._draw(this.activatedRoute.snapshot.queryParams);
    }
// Define an array with all fonts
    var fonts = ["Pacifico", "VT323", "Quicksand", "Inconsolata"];

    this.canvas = new fabric.Canvas('c');
    const textbox = new fabric.Textbox('Lorum ipsum dolor sit amet', {
      left: 50,
      top: 50,
      width: 150,
      fontSize: 20
    });
    this.canvas.add(textbox).setActiveObject(textbox);
    fonts.unshift('Times New Roman');

// Populate the fontFamily select
//     var select = document.getElementById("font-family");
//
//     fonts.forEach(function(font) {
//       var option = document.createElement('option');
//       option.innerHTML = font;
//       option.value = font;
//       select.appendChild(option);
//     });


    // A new emoji generated
    // this.eventbus.on('EG_EMOJI_GENERATE', (query) => {
    //   this._draw(query);
    // });

    // Browser extension attached
    // this.eventbus.on('CE_ATTACH', () => {
    //   this.browserExtensionEnabled = true;
    // });
  }

  loadAndUse(font) {
    var myfont = new FontFaceObserver(font)
    const canvas = this.canvas;
    myfont.load()
      .then(function() {
        // when font is loaded, use it.
        canvas.getActiveObject().set("fontFamily", font);
        canvas.requestRenderAll();
      }).catch(function(e) {
      console.log(e)
      alert('font loading failed ' + font);
    });
  }

  private _draw(query: any): void {
    console.debug('A new emoji generated', query);

    this.text = query.text;
    this.color = query.color;
    this.fontKey = query.font;
    this.queryLocale = query.locale;
    // this.queryString = queryString.stringify(query);
    this.visibleResult = true;
    this.visibleRegister = false;
  }

  get emojiUrl(): string | null {
    return this.queryString ? `/emoji?${this.queryString}` : null;
  }

  get emojiDownloadUrl(): string | null {
    return this.queryString ? `/emoji_download?${this.queryString}` : null;
  }

  get formattedText(): string {
    return this.text ? this.text.replace(/\n/, ' ') : '';
  }

  get fontName(): string {
    if (!this.fontKey) {
      return '';
    }

    const font = {name: ''}
    return font ? font.name : '';
  }

  get cssColor(): string {
    return this.color ? `#${this.color.slice(0, 6)}` : '';
  }

  get isRegisterSupportedBrowser(): boolean {
    return this.browser.name === 'chrome' || this.browser.name === 'firefox';
  }

  get visibleRegisterButton(): boolean {
    return this.browserExtensionEnabled || this.isRegisterSupportedBrowser;
  }

  download(): void {
    console.log('Download clicked');
    // Add your download logic here
  }

  toggleShare(): void {
    this.visibleShare = !this.visibleShare;
    this.visibleRegister = false;
  }

  toggleRegister(): void {
    this.visibleRegister = !this.visibleRegister;
    this.visibleShare = false;
  }

  onChangeFont (fontFamily: HTMLSelectElement) {
    this.fontKey = fontFamily.value;fabric

    if (this.fontKey !== 'Times New Roman') {
      this.loadAndUse(this.fontKey);
    } else {
      this.canvas.getActiveObject().set("fontFamily", );
      this.canvas.requestRenderAll();
    }
  }

  selectImage (id: any) {
    this.selectedImageId = id;

  }

  ngAfterViewInit (): void {
    //
    /**
     * url : https://dev-wfbiz.sandollcloud.com/fonts/all
     * Bearer Token : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwaWR4IjoxOTMsImlhdCI6MTcyMjMxNTUzMywiZXhwIjoxNzIyMzI2MzMzLCJhdWQiOiJzZCIsImlzcyI6InNhbmRvbGwiLCJzdWIiOiJhY2Nlc3MifQ.tlhDNQK8DpXqrUHKtWxAD4_wvSGZDro71LOcJ4PRL-Q
     */
    const header = {
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwaWR4IjoxOTMsImlhdCI6MTcyMjgxOTkzOCwiZXhwIjoxNzIyODMwNzM4LCJhdWQiOiJzZCIsImlzcyI6InNhbmRvbGwiLCJzdWIiOiJhY2Nlc3MifQ.oa8OKC3_mFpXzf_wb4FkU3AJyesp8DYqgBwpRFcazys'
    }
    this.httpClient.post('/sdclound/fonts/family', {}, {headers: header}).subscribe((res: any) => {
      const result: FamilyInfo[] = res.resultData
      this.fonts = result;
    });
    this.setupIntersectionObserver()
  }

  setupIntersectionObserver() {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const familyID = entry.target.getAttribute('data-family-id');
          const font = this.fonts.find(f => f.familyID === familyID);
          if (font) {
            this.loadImageForItem(font);
          }
        }
      });
    }, options);

    this.fontItems.changes.subscribe(() => {
      this.fontItems.forEach(item => observer.observe(item.nativeElement));
    });
  }loadImageForItem(item: FamilyInfo) {
    const familyId = item.familyID;
    const weight = item.defaultCssInfoDict['font-weight'];
    const font = item.fontList.find((f) => f.cssInfoDict['font-weight'] === weight+'');

    if (font) {
      this.httpClient.get(`/django/api/getWDWFExampleCrop/`, {
        params: {
          fontID: font.fontID,
          familyID: familyId,
        },
        responseType: 'blob'  // 응답 타입을 'blob'으로 지정
      }).subscribe(
        (blob: Blob) => {
          const imageUrl = URL.createObjectURL(blob);
          item.imageUrl = imageUrl;
        },
        (error) => {
          console.error('Error loading image:', error);
        }
      );
    }
  }
}


const DEFAULT_COLORS = {
  hex: '#EC71A1',
  rgba: {
    r: 236,
    g: 113,
    b: 161,
    a: 1,
  },
  a: 1,
};

const DEFAULT_BACKGROUND_COLOR_HEX = '00000000';
const DEFAULT_BACKGROUND_COLORS = {
  r: 0,
  g: 0,
  b: 0,
  a: 0,
};

const PRESET_COLORS = [
  '#3AB0C7',
  '#38BA91',
  '#EC71A1',
  '#EAA822',
  '#1111FF',
  '#00BB00',
  '#FF0000',
  '#000000',
  '#FFFFFF',
];

const BACKGROUND_PRESET_COLORS = [
  '#1111FF',
  '#00BB00',
  '#FF0000',
  '#000000',
  '#FFFFFF',
  'rgba(0, 0, 0, 0)',
];

class defaultCssInfoDict {
  "font-family": "Sandoll GothicNeo1"
  "font-weight": "500"
}

class FamilyInfo {
  "familyID": "8"
  "familyName": "Sandoll 고딕Neo1"
  "fontFileFormat": "OTF"
  "fontIds": "334;335;336;337338339340341342"
  "styleName": "MinBuri"
  "fontReleaseDate": "2011-01-01"
  defaultCssInfoDict: defaultCssInfoDict
  fontList: FontInfo[]
  imageUrl: any;
}
class CssInfoDict {
  "font-family": "Sandoll GothicNeo1"
  "font-weight": "100"
}
class FontInfo {
  "cssInfoDict": CssInfoDict
  "fontID": "334"
  "familyName": "Sandoll 고딕Neo1"
  "weight": "01 Th"
  "fontFileName": "SDGothicNeoa-aTh"
}

