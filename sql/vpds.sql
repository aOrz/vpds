/*
 Navicat Premium Data Transfer

 Source Server         : fddcn.cn_3306
 Source Server Type    : MySQL
 Source Server Version : 50556
 Source Host           : 101.236.23.161:3306
 Source Schema         : vpds

 Target Server Type    : MySQL
 Target Server Version : 50556
 File Encoding         : 65001

 Date: 08/07/2017 11:52:03
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for package
-- ----------------------------
DROP TABLE IF EXISTS `package`;
CREATE TABLE `package` (
  `package_name` varchar(100) NOT NULL,
  `package_version` varchar(100) DEFAULT NULL,
  `package_intro` varchar(1000) DEFAULT NULL,
  `packaage_label` varchar(1000) DEFAULT NULL,
  `package_author` varchar(100) DEFAULT NULL,
  `package_author_email` varchar(1000) DEFAULT NULL,
  `package_string` varchar(10000) DEFAULT NULL,
  `kind` varchar(100) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;;

SET FOREIGN_KEY_CHECKS = 1;
