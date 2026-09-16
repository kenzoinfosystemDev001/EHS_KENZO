import { Module } from '@nestjs/common';
import { AreasController } from './areas.controller';
import { MasterDataService } from './master-data.service';
import { OrganizationsController } from './organizations.controller';
import { PlantsController } from './plants.controller';
import { DepartmentsController } from './departments.controller';
import { UsersController } from './users.controller';

@Module({
  controllers: [
    OrganizationsController,
    PlantsController,
    DepartmentsController,
    UsersController,
    AreasController,
  ],
  providers: [MasterDataService],
  exports: [MasterDataService],
})
export class MasterDataModule {}
