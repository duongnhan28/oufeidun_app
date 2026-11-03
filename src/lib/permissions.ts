import type {User} from '../types';
export const permissionLabels={receive_stock:'Nhập hàng và Excel số lượng',adjust_stock:'Chỉnh tồn, xuất kho và ghi nhận lỗi',manage_products:'Thêm, sửa, xóa danh mục sản phẩm',manage_prices:'Sửa giá chung cho mọi máy và đơn sau',manage_returns:'Trả, đổi hàng và hủy đơn đã bán',view_reports:'Xem báo cáo doanh thu và chi tiết sản phẩm',view_audit:'Xem lịch sử thao tác'};
export type Permission=keyof typeof permissionLabels;
export function hasPermission(user:User|undefined,key:Permission){return !!user&&(user.role==='admin'||(user.permissions==null?key!=='receive_stock':user.permissions[key]===true));}
