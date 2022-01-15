import { ChangeDetectorRef, Component, ElementRef, HostListener, ViewChild } from '@angular/core';

@Component({
  selector: 'app-img-text-art',
  templateUrl: './img-text-art.component.html',
  styleUrls: ['./img-text-art.component.css']
})
export class ImgTextArtComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  asciiArt: string | undefined;
  maxCanvasWidth = 400;
  asciiArtWidth = 80;
  customIntensityRamp: string = "@%#*+=-;. ";
  imageData: ImageData | undefined;
  fontSize: string = '17px';
  constructor(private cdr: ChangeDetectorRef) {}

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.setTextStyle();
  }

  setTextStyle () {
    const screenWidth = window.innerWidth;
    const fontSize = Math.round(screenWidth / 60);
    if (fontSize > 17) {
      this.fontSize = '17px';
      return;
    }
    this.fontSize = `${fontSize}px`;
  }

  getMostIntenseColor(pixel: Uint8ClampedArray): number {
    const red = pixel[0];
    const green = pixel[1];
    const blue = pixel[2];
    return Math.max(red, green, blue);
  }

  processImage(imgData: ImageData): string {
    let output = '';

    const aspectRatio = imgData.width / imgData.height;
    const asciiArtHeight = Math.floor(this.asciiArtWidth / aspectRatio);

    const scaleFactorX = imgData.width / this.asciiArtWidth;
    const scaleFactorY = imgData.height / asciiArtHeight;

    for (let i = 0; i < asciiArtHeight; i += 2) {
      for (let j = 0; j < this.asciiArtWidth; j++) {
        const x = Math.floor(j * scaleFactorX);
        const y = Math.floor(i * scaleFactorY);

        const index = (y * imgData.width + x) * 4;
        const pixel = imgData.data.subarray(index, index + 3);
        const intensityRampIdx = (this.getMostIntenseColor(pixel) / 256) * this.customIntensityRamp.length;
        output += this.customIntensityRamp.charAt(intensityRampIdx);
      }
      output += '\n';
    }

    return output;
  }

  updateAsciiArt(): void {
    // Manually update ASCII art when customIntensityRamp changes
    if (!this.imageData) {
      return;
    }
    this.asciiArt = this.processImage(this.imageData);
    // Trigger change detection manually
    this.cdr.detectChanges();
  }

  onFileSelected ($event: File) {
    if ($event) {
      const file = $event;

      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          if (context) {
            const scaleFactor = this.maxCanvasWidth / img.width;
            const scaledWidth = this.maxCanvasWidth;
            const scaledHeight = img.height * scaleFactor;

            canvas.width = scaledWidth;
            canvas.height = scaledHeight;

            context.drawImage(img, 0, 0, canvas.width, canvas.height);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            this.imageData = imageData;
            this.asciiArt = this.processImage(imageData);
          }
        };

        img.src = e.target?.result as string;
        this.setTextStyle();
      };

      reader.readAsDataURL(file);
    }
  }
}
