import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface GlyphPair {
  left: string;
  right: string;
}

interface GlyphMouth {
  mouth: string;
}

@Component({
  selector: 'app-emoji',
  templateUrl: './emoji.component.html',
  styleUrls: ['./emoji.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush // Add this line
})
export class EmojiComponent implements OnInit {
  data1!: { glyphset: GlyphPair[] };
  data2!: { glyphset: GlyphPair[] };
  data3!: { glyphset: GlyphMouth[] };

  selectedPair1: GlyphPair | null = null;
  selectedPair2: GlyphPair | null = null;
  selectedMouth: GlyphMouth | null = null;

  constructor(private cdRef: ChangeDetectorRef, private http: HttpClient) {}


  ngOnInit() {
    this.fetchData1();
    this.fetchData2();
    this.fetchData3();
  }

  fetchData1() {
    this.http.get<{ glyphset: GlyphPair[] }>('./assets/data1.json').subscribe(data => {
      this.data1 = data;
    });
  }

  fetchData2() {
    this.http.get<{ glyphset: GlyphPair[] }>('./assets/data2.json').subscribe(data => {
      this.data2 = data;
    });
  }

  fetchData3() {
    this.http.get<{ glyphset: GlyphMouth[] }>('./assets/data3.json').subscribe(data => {
      this.data3 = data;
    });
  }

  get generatedEmoji(): string {
    let leftSide = this.selectedPair1?.left || this.generateSpaces(this.maxPair1Length);
    let middleLeft = this.selectedPair2?.left || (this.selectedPair1 ? this.generateSpaces(this.maxPair2Length) : "");
    let middle = this.selectedMouth?.mouth || (this.selectedPair1 || this.selectedPair2 ? this.generateSpaces(this.maxMouthLength) : "");
    let middleRight = this.selectedPair2?.right || (this.selectedPair1 ? this.generateSpaces(this.maxPair2Length) : "");
    let rightSide = this.selectedPair1?.right || this.generateSpaces(this.maxPair1Length);

    return leftSide + middleLeft + middle + middleRight + rightSide;
  }
  get maxPair1Length(): number {
    return Math.max(...this.data1.glyphset.map(pair => pair.left.length));
  }

  get maxPair2Length(): number {
    return Math.max(...this.data2.glyphset.map(pair => pair.left.length));
  }

  get maxMouthLength(): number {
    return Math.max(...this.data3.glyphset.map(mouth => mouth.mouth.length));
  }

  generateSpaces(length: number): string {
    return ' '.repeat(length);
  }

  selectPair1(pair: GlyphPair): void {
    this.selectedPair1 = pair;
    this.cdRef.detectChanges();
  }

  selectPair2(pair: GlyphPair): void {
    this.selectedPair2 = pair;
    this.cdRef.detectChanges();
  }

  selectMouth(mouth: GlyphMouth): void {
    this.selectedMouth = mouth;
    this.cdRef.detectChanges();
  }
}
