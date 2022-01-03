import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-image-uploader',
  templateUrl: './image-uploader.component.html',
  styleUrls: ['./image-uploader.component.css']
})
export class ImageUploaderComponent {
  uploadForm: FormGroup;
  selectedFile: File | undefined;
  isDragging = false; // 드래그 중인지 여부를 나타내는 변수
  @Output() fileSelected: EventEmitter<File> = new EventEmitter<File>();

  constructor(private fb: FormBuilder) {
    this.uploadForm = this.fb.group({
      image: ['']
    });
  }

  onDragOver(event: DragEvent): void {
    this.isDragging = true;
    event.preventDefault();
  }

  onDragLeave(event: DragEvent): void {
    this.isDragging = false;
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file) {
      // 드롭한 파일을 처리하는 로직을 여기에 추가하세요.
      console.log('Dropped file:', file);
      // file을 this.selectedFile 등에 할당하고 원하는 처리를 수행하세요.
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadForm.get('image')?.setValue(file);
      this.fileSelected.emit(file); // 파일이 선택되었을 때 이벤트 발생
    }
  }

  onUpload(): void {
    if (this.selectedFile) {
      const formData = new FormData();
      formData.append('image', this.selectedFile);

      // this.imageUploadService.uploadImage(formData).subscribe(
      //   (response) => {
      //     // 이미지 업로드 성공 시 처리 로직을 추가하세요.
      //     console.log('Image uploaded successfully:', response);
      //   },
      //   (error) => {
      //     // 이미지 업로드 실패 시 처리 로직을 추가하세요.
      //     console.error('Image upload failed:', error);
      //   }
      // );
    }
  }
}
