-- SavingsGoal: groupId에 외래키 및 Cascade 삭제 추가
ALTER TABLE `SavingsGoal` ADD CONSTRAINT `SavingsGoal_groupId_fkey`
  FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- MinigameResult: groupId에 외래키 및 Cascade 삭제 추가
ALTER TABLE `minigame_results` ADD CONSTRAINT `minigame_results_groupId_fkey`
  FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
