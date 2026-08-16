import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniApp } from './entities/miniapp.entity';
import { isEmail } from 'class-validator';
import { IsUrlReachableConstraint } from '../common/validators/is-url-reachable.validator';
import { MailService } from '../mail/mail.service';

@Injectable()
export class MiniappService {
  private readonly logger = new Logger(MiniappService.name);

  constructor(
    @InjectRepository(MiniApp)
    private miniappRepository: Repository<MiniApp>,
    private mailService: MailService,
  ) {}

  async create(data: Partial<MiniApp>) {
    data.status = 'Processing';
    const app = this.miniappRepository.create(data);
    let savedApp;
    try {
      savedApp = await this.miniappRepository.save(app);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('An app with this App ID already exists.');
      }
      throw error;
    }
    
    // Kick off async validation
    this.validateMiniAppAsync(savedApp.id, data).catch(err => {
      this.logger.error(`Error in async validation for app ${savedApp.id}:`, err);
    });

    return savedApp;
  }

  async validateMiniAppAsync(id: string, data: Partial<MiniApp>) {
    const errors: Record<string, string> = {};
    const urlValidator = new IsUrlReachableConstraint();

    const checks: Promise<void>[] = [];

    if (!data.ownerEmail || !isEmail(data.ownerEmail)) {
      errors.ownerEmail = 'ownerEmail must be a valid email address.';
    }
    if (data.supportEmail && !isEmail(data.supportEmail)) {
      errors.supportEmail = 'supportEmail must be a valid email address.';
    }

    if (data.logo) {
      checks.push(
        urlValidator.validate(data.logo, null as any).then(isValid => {
          if (!isValid) errors.logo = 'logo must be a reachable and accessible URL.';
        })
      );
    }

    if (data.integrationMethod === 'WEBVIEW') {
      if (!data.integrationConfig?.productionUrl) {
        errors['integrationConfigWebView.productionUrl'] = 'productionUrl is required for WebView integration.';
      } else {
        const prodUrl = data.integrationConfig.productionUrl;
        const allowLocal = process.env.ALLOW_LOCAL_PROD_URLS === 'true';
        
        let isValidProdUrl = true;
        
        if (!allowLocal) {
          if (!prodUrl.startsWith('https://')) {
             errors['integrationConfigWebView.productionUrl'] = 'Production URL must use HTTPS.';
             isValidProdUrl = false;
          } else if (prodUrl.includes('localhost') || prodUrl.includes('127.0.0.1')) {
             errors['integrationConfigWebView.productionUrl'] = 'Production URL cannot be localhost.';
             isValidProdUrl = false;
          }
        }
        
        if (isValidProdUrl) {
          checks.push(
            urlValidator.validate(prodUrl, null as any).then(isValid => {
              if (!isValid) errors['integrationConfigWebView.productionUrl'] = 'productionUrl must be a reachable and accessible URL.';
            })
          );
        }
      }
      
      if (data.integrationConfig?.stagingUrl) {
        checks.push(
          urlValidator.validate(data.integrationConfig.stagingUrl, null as any).then(isValid => {
            if (!isValid) errors['integrationConfigWebView.stagingUrl'] = 'stagingUrl must be a reachable and accessible URL.';
          })
        );
      }
    }

    await Promise.all(checks);

    if (Object.keys(errors).length > 0) {
      await this.miniappRepository.update(id, {
        status: 'Issues',
        validationErrors: errors as any,
        hasUnreadIssues: true
      });
      if (data.ownerEmail) {
        await this.mailService.sendRegistrationFailureEmail(data.ownerEmail, data.name || data.appId || 'Unknown App', errors);
      }
    } else {
      await this.miniappRepository.update(id, {
        status: 'Draft',
        validationErrors: null as any,
        hasUnreadIssues: false
      });
      if (data.ownerEmail) {
        await this.mailService.sendRegistrationSuccessEmail(data.ownerEmail, data.name || data.appId || 'Unknown App');
      }
    }
  }

  findAll(query: any = {}) {
    return this.miniappRepository.find({ where: query, order: { createdAt: 'DESC' } });
  }

  // Fetch all notifications (apps with issues)
  getNotifications() {
    return this.miniappRepository.find({ 
      where: { status: 'Issues' },
      order: { updatedAt: 'DESC' }
    });
  }

  async markNotificationRead(id: string) {
    await this.miniappRepository.update(id, { hasUnreadIssues: false });
    return { success: true };
  }

  async checkExists(appId?: string, name?: string, excludeId?: string) {
    const exists = { appIdExists: false, nameExists: false };
    
    if (appId) {
      const q = this.miniappRepository.createQueryBuilder('app').where('app.appId = :appId', { appId });
      if (excludeId) q.andWhere('app.id != :excludeId', { excludeId });
      if (await q.getOne()) exists.appIdExists = true;
    }
    
    if (name) {
      const q = this.miniappRepository.createQueryBuilder('app').where('app.name = :name', { name });
      if (excludeId) q.andWhere('app.id != :excludeId', { excludeId });
      if (await q.getOne()) exists.nameExists = true;
    }
    
    return exists;
  }

  async findOne(id: string) {
    return this.miniappRepository.findOne({ where: { id } });
  }

  async update(id: string, data: Partial<MiniApp>) {
    data.status = 'Processing';
    await this.miniappRepository.update(id, data);
    
    // Kick off async validation
    this.validateMiniAppAsync(id, data).catch(err => {
      this.logger.error(`Error in async validation for app ${id}:`, err);
    });

    return this.findOne(id);
  }

  remove(id: string) {
    return this.miniappRepository.delete(id);
  }
}
