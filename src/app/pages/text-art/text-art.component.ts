import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import * as figlet from 'figlet';
import { Clipboard } from '@angular/cdk/clipboard';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-text-art',
  templateUrl: './text-art.component.html',
  styleUrls: ['./text-art.component.css']
})
export class TextArtComponent implements OnInit{
  fitletText: string = '';
  HelloWorld: string = `▄▀█ █▀▀ █░█░█ █▀▄ █▀▀ █▀▀ █▀▀ █▄░█ █▀
 █▀█ █▄▄ ▀▄▀▄▀ █▄▀ █▄▄ █░░ ██▄ █░▀█ ▄█
`;
  selectedPair1: string = 'Ghost';
  textStyls: string[] = [
    '1Row',
    '3-D',
    '3D Diagonal',
    '3D-ASCII',
    '3x5',
    '4Max',
    '5 Line Oblique',
    'Acrobatic',
    'Alligator',
    'Alligator2',
    'Alpha',
    'Alphabet',
    'AMC AAA01',
    'AMC Neko',
    'AMC Razor',
    'AMC Razor2',
    'AMC Slash',
    'AMC Slider',
    'AMC Thin',
    'AMC Tubes',
    'AMC Untitled',
    'AMC 3 Line',
    'AMC 3 Liv1',
    'ANSI Regular',
    'ANSI Shadow',
    'Arrows',
    'ASCII New Roman',
    'Avatar',
    'B1FF',
    'Banner',
    'Banner3',
    'Banner3-D',
    'Banner4',
    'Barbwire',
    'Basic',
    'Bear',
    'Bell',
    'Benjamin',
    'Big',
    'Big Chief',
    'Big Money-ne',
    'Big Money-nw',
    'Big Money-se',
    'Big Money-sw',
    'Bigfig',
    'Binary',
    'Block',
    'Blocks',
    'Bloody',
    'Bolger',
    'Braced',
    'Bright',
    'Broadway',
    'Broadway KB',
    'Bubble',
    'Bulbhead',
    'Caligraphy',
    'Caligraphy2',
    'Calvin S',
    'Cards',
    'Catwalk',
    'Chiseled',
    'Chunky',
    'Coinstak',
    'Cola',
    'Colossal',
    'Computer',
    'Contessa',
    'Contrast',
    'Cosmike',
    'Crawford',
    'Crawford2',
    'Crazy',
    'Cricket',
    'Cursive',
    'Cyberlarge',
    'Cybermedium',
    'Cybersmall',
    'Cygnet',
    'DANC4',
    'Dancing Font',
    'Decimal',
    'Def Leppard',
    'Delta Corps Priest 1',
    'Diamond',
    'Diet Cola',
    'Digital',
    'Doh',
    'Doom',
    'DOS Rebel',
    'Dot Matrix',
    'Double',
    'Double Shorts',
    'Dr Pepper',
    'DWhistled',
    'Efti Chess',
    'Efti Font',
    'Efti Italic',
    'Efti Piti',
    'Efti Robot',
    'Efti Wall',
    'Efti Water',
    'Electronic',
    'Elite',
    'Epic',
    'Fender',
    'Filter',
    'Fire Font-k',
    'Fire Font-s',
    'Flipped',
    'Flower Power',
    'Four Tops',
    'Fraktur',
    'Fun Face',
    'Fun Faces',
    'Fuzzy',
    'Georgi16',
    'Georgia11',
    'Ghost',
    'Ghoulish',
    'Glenyn',
    'Goofy',
    'Gothic',
    'Graceful',
    'Gradient',
    'Graffiti',
    'Greek',
    'Heart Left',
    'Heart Right',
    'Henry 3D',
    'Hex',
    'Hieroglyphs',
    'Hollywood',
    'Horizontal Left',
    'Horizontal Right',
    'ICL-1900',
    'Impossible',
    'Invita',
    'Isometric1',
    'Isometric2',
    'Isometric3',
    'Isometric4',
    'Italic',
    'Ivrit',
    'Jacky',
    'Jazmine',
    'Jerusalem',
    'JS Block Letters',
    'JS Bracket Letters',
    'JS Capital Curves',
    'JS Cursive',
    'JS Stick Letters',
    'Katakana',
    'Kban',
    'Keyboard',
    'Knob',
    'Konto',
    'Konto Slant',
    'Larry 3D',
    'Larry 3D 2',
    'LCD',
    'Lean',
    'Letters',
    'Lil Devil',
    'Line Blocks',
    'Linux',
    'Lockergnome',
    'Madrid',
    'Marquee',
    'Maxfour',
    'Merlin1',
    'Merlin2',
    'Mike',
    'Mini',
    'Mirror',
    'Mnemonic',
    'Modular',
    'Morse',
    'Morse2',
    'Moscow',
    'Mshebrew210',
    'Muzzle',
    'Nancyj',
    'Nancyj-Fancy',
    'Nancyj-Improved',
    'Nancyj-Underlined',
    'Nipples',
    'NScript',
    'NT Greek',
    'NV Script',
    'O8',
    'Octal',
    'Ogre',
    'Old Banner',
    'OS2',
    'Pagga',
    'Patorjk\'s Cheese',
    'Patorjk-HeX',
    'Pawp',
    'Peaks',
    'Peaks Slant',
    'Pebbles',
    'Pepper',
    'Poison',
    'Puffy',
    'Puzzle',
    'Pyramid',
    'Rammstein',
    'Rectangles',
    'Red Phoenix',
    'Relief',
    'Relief2',
    'Reverse',
    'Roman',
    'Rot13',
    'Rotated',
    'Rounded',
    'Rowan Cap',
    'Rozzo',
    'Runic',
    'Runyc',
    'S Blood',
    'Santa Clara',
    'Script',
    'Serifcap',
    'Shadow',
    'Shimrod',
    'Short',
    'SL Script',
    'Slant',
    'Slant Relief',
    'Slide',
    'Small',
    'Small Caps',
    'Small Isometric1',
    'Small Keyboard',
    'Small Poison',
    'Small Script',
    'Small Shadow',
    'Small Slant',
    'Small Tengwar',
    'Soft',
    'Speed',
    'Spliff',
    'Stacey',
    'Stampate',
    'Stampatello',
    'Standard',
    'Star Strips',
    'Star Wars',
    'Stellar',
    'Stforek',
    'Stick Letters',
    'Stop',
    'Straight',
    'Stronger Than All',
    'Sub-Zero',
    'Swamp Land',
    'Swan',
    'Sweet',
    'Tanja',
    'Tengwar',
    'Term',
    'Test1',
    'The Edge',
    'Thick',
    'Thin',
    'THIS',
    'Thorned',
    'Three Point',
    'Ticks',
    'Ticks Slant',
    'Tiles',
    'Tinker-Toy',
    'Tombstone',
    'Train',
    'Trek',
    'Tsalagi',
    'Tubular',
    'Twisted',
    'Two Point',
    'Univers',
    'USA Flag',
    'Varsity',
    'Wavy',
    'Weird',
    'Wet Letter',
    'Whimsy',
    'Wow'
    ];
  inputText: string = 'No Data!';
  @ViewChild('captureElement') captureElement: ElementRef | undefined;


  constructor (
    private clipboard: Clipboard,) {
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.setTextStyle();
  }

  setTextStyle () {
    const screenWidth = window.innerWidth;
    const fontSize = Math.round(screenWidth / 55);
    if (fontSize > 17) {
      this.fontSize = '17px';
      return;
    }
    this.fontSize = `${fontSize}px`;
  }

  ngOnInit (): void {
    this.renderText(this.inputText);
    this.setTextStyle();
  }
  // get screen size
  fontSize: string = '1rem';
  getScreenSize (event: any) {
    console.log(event.target.innerWidth);
    console.log(event.target.innerHeight);
  }

  renderText(inputTxt: string): void {
    if (inputTxt == null || inputTxt === '') {
      inputTxt = 'No Data!';
    }
    const assets: any = `/figlet/${this.selectedPair1}`;


    figlet.text(inputTxt, {
      font: assets,
      horizontalLayout: 'default',
      verticalLayout: 'default',
      width: 102,
      whitespaceBreak: true,
    }, (err, data) => {
      if (err) {
        console.log('Something went wrong...');
        console.dir(err);
        return;
      }
      if (data == null) {
        return;
      }
      console.log(data);
      this.fitletText = data;
    });
  }

  onChange ($event: Event) {
    this.inputText = ($event.target as HTMLInputElement).value;
    this.renderText(this.inputText);
  }

  capture() {
    if (this.captureElement == null) {
      return;
    }
    html2canvas(this.captureElement.nativeElement).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = 'captured-image.png';
      link.click();
    });
  }
  copyToClipboard () {
    // this.clipboard.copy(this.fitletText);
    // this.capture()
    this.captureAndCopy();
    // setTimeout(() => {this.buttonText = "Copy to Clipboard"; this.cdRef.detectChanges();}, 2000);
  }
  captureAndCopy() {
    if (this.captureElement == null) {
      return;
    }
    html2canvas(this.captureElement.nativeElement).then(canvas => {
      const imgData = canvas.toDataURL('image/png');

      const imageElement = new Image();
      imageElement.src = imgData;

      const clipboardData = new DataTransfer();
      clipboardData.items.add(new File([imageElement.src], 'captured-image.png', { type: 'image/png' }));

      // @ts-ignore
      navigator.clipboard.write(clipboardData).then(() => {
        console.log('Image copied to clipboard!');
        alert('Image copied to clipboard!')
      }).catch(err => {
        console.error('Failed to copy image to clipboard:', err);
      });
    });
  }
  selectPair1 (pair: any) {
    this.selectedPair1 = pair.value;
    this.renderText(this.inputText);
  }
}
