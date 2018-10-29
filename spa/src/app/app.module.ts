import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {ThreeModule} from './three/three.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ThreeModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
