import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ShellComponent } from './shell.component';
import { AuthService } from '../../core/services/auth.service';

describe('ShellComponent', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['getTenantId', 'getUsername', 'getRole', 'logout']);
    authSpy.getTenantId.and.returnValue('acme');
    authSpy.getUsername.and.returnValue('jdoe');
    authSpy.getRole.and.returnValue('USER');

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  it('renders a sign-out button that logs out and redirects to /login', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.sidebar-foot button');
    expect(button).withContext('expected a logout button in the sidebar footer').not.toBeNull();
    expect(button.textContent).toContain('Sign out');

    button.click();

    expect(authSpy.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
