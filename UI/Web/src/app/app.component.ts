import {Component, DestroyRef, HostListener, inject, Inject, OnInit} from '@angular/core';
import {NavigationStart, Router, RouterOutlet} from '@angular/router';
import {map, shareReplay, take} from 'rxjs/operators';
import { AccountService } from './_services/account.service';
import { LibraryService } from './_services/library.service';
import { NavService } from './_services/nav.service';
import { filter } from 'rxjs/operators';
import {NgbModal, NgbOffcanvas, NgbRatingConfig} from '@ng-bootstrap/ng-bootstrap';
import { DOCUMENT, NgClass, NgIf, AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import {ThemeService} from "./_services/theme.service";
import { SideNavComponent } from './sidenav/_components/side-nav/side-nav.component';
import {NavHeaderComponent} from "./nav/_components/nav-header/nav-header.component";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {animate, state, style, transition, trigger} from "@angular/animations";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: true,
  animations: [
      trigger('fadeIn', [
        // the "out" style determines the "resting" state of the element when it is visible.
        state('out', style({opacity: 0})),
        // in state
        state('in', style({opacity: 1})),

        transition('out => in', animate('700ms ease-in')),
        transition('in => out', animate('700ms ease-in')),
      ])
  ],
  imports: [NgClass, NgIf, SideNavComponent, RouterOutlet, AsyncPipe, NavHeaderComponent]
})
export class AppComponent implements OnInit {

  transitionState$!: Observable<boolean>;
  fade = 'out';

  private readonly destroyRef = inject(DestroyRef);
  private readonly offcanvas = inject(NgbOffcanvas);

  constructor(private accountService: AccountService, public navService: NavService,
    private libraryService: LibraryService,
    private router: Router, private ngbModal: NgbModal, ratingConfig: NgbRatingConfig,
    @Inject(DOCUMENT) private document: Document, private themeService: ThemeService) {

    // Setup default rating config
    ratingConfig.max = 5;
    ratingConfig.resettable = true;

    // Close any open modals when a route change occurs
    router.events
      .pipe(
          filter(event => event instanceof NavigationStart),
          takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(async (event) => {

        if (!this.ngbModal.hasOpenModals() && !this.offcanvas.hasOpenOffcanvas()) return;

        if (this.ngbModal.hasOpenModals()) {
          this.ngbModal.dismissAll();
        }

        if (this.offcanvas.hasOpenOffcanvas()) {
          this.offcanvas.dismiss();
        }

        if ((event as any).navigationTrigger === 'popstate') {
          const currentRoute = this.router.routerState;
          await this.router.navigateByUrl(currentRoute.snapshot.url, { skipLocationChange: true });
        }

      });


    this.transitionState$ = this.accountService.currentUser$.pipe(map((user) => {
      if (!user) return false;
      return user.preferences.noTransitions;
    }), takeUntilDestroyed(this.destroyRef));
  }

  @HostListener('window:resize', ['$event'])
  @HostListener('window:orientationchange', ['$event'])
  setDocHeight() {
    // Sets a CSS variable for the actual device viewport height. Needed for mobile dev.
    const vh = window.innerHeight * 0.01;
    this.document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  ngOnInit(): void {
    this.setDocHeight();
    this.setCurrentUser();
  }

  setCurrentUser() {
    const user = this.accountService.getUserFromLocalStorage();
    this.accountService.setCurrentUser(user);

    if (user) {
      // Bootstrap anything that's needed
      this.themeService.getThemes().subscribe();
      this.libraryService.getLibraryNames().pipe(take(1), shareReplay()).subscribe();
    }
  }
}
