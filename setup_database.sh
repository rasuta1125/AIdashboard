#!/bin/bash

# ============================================================
# 不動産売買決済特化型タスク管理ソフト
# データベースセットアップスクリプト
# ============================================================

set -e  # エラー時に即座に終了

# 色付き出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# データベース名
DB_NAME="${DB_NAME:-real_estate_settlement}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

log_info "============================================================"
log_info "不動産売買決済管理システム - データベースセットアップ"
log_info "============================================================"
echo ""

# 引数チェック
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "使用方法:"
    echo "  $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  --create-db        データベースを作成"
    echo "  --drop-db          データベースを削除（警告: データが失われます）"
    echo "  --reset-db         データベースをリセット（削除 → 作成 → スキーマ適用）"
    echo "  --apply-schema     スキーマのみ適用"
    echo "  --test-connection  接続テスト"
    echo "  --help, -h         このヘルプを表示"
    echo ""
    echo "環境変数:"
    echo "  DB_NAME   データベース名（デフォルト: real_estate_settlement）"
    echo "  DB_USER   ユーザー名（デフォルト: postgres）"
    echo "  DB_HOST   ホスト名（デフォルト: localhost）"
    echo "  DB_PORT   ポート番号（デフォルト: 5432）"
    echo "  DB_PASSWORD パスワード（必要に応じて）"
    echo ""
    echo "例:"
    echo "  DB_NAME=mydb $0 --create-db"
    echo "  $0 --reset-db"
    exit 0
fi

# PostgreSQL接続テスト
test_connection() {
    log_info "PostgreSQL接続をテスト中..."
    
    if command -v psql > /dev/null 2>&1; then
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt > /dev/null 2>&1; then
            log_success "PostgreSQLへの接続が成功しました"
            return 0
        else
            log_error "PostgreSQLへの接続に失敗しました"
            log_warning "接続情報を確認してください:"
            echo "  ホスト: $DB_HOST"
            echo "  ポート: $DB_PORT"
            echo "  ユーザー: $DB_USER"
            return 1
        fi
    else
        log_error "psqlコマンドが見つかりません"
        log_warning "PostgreSQLクライアントをインストールしてください"
        return 1
    fi
}

# データベース作成
create_database() {
    log_info "データベース '$DB_NAME' を作成中..."
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        log_warning "データベース '$DB_NAME' は既に存在します"
        return 1
    else
        createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
        log_success "データベース '$DB_NAME' を作成しました"
        return 0
    fi
}

# データベース削除
drop_database() {
    log_warning "データベース '$DB_NAME' を削除しようとしています"
    read -p "本当に削除しますか？ (yes/no): " confirm
    
    if [ "$confirm" == "yes" ]; then
        log_info "データベース '$DB_NAME' を削除中..."
        dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null || true
        log_success "データベース '$DB_NAME' を削除しました"
        return 0
    else
        log_info "削除をキャンセルしました"
        return 1
    fi
}

# スキーマ適用
apply_schema() {
    log_info "データベーススキーマを適用中..."
    
    if [ ! -f "database_schema.sql" ]; then
        log_error "database_schema.sql が見つかりません"
        return 1
    fi
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database_schema.sql
    log_success "スキーマの適用が完了しました"
    return 0
}

# データベースリセット
reset_database() {
    log_warning "データベースをリセットします（全データが削除されます）"
    drop_database
    if [ $? -eq 0 ]; then
        create_database
        apply_schema
    fi
}

# データベース情報表示
show_database_info() {
    log_info "データベース情報:"
    echo "  データベース名: $DB_NAME"
    echo "  ホスト: $DB_HOST"
    echo "  ポート: $DB_PORT"
    echo "  ユーザー: $DB_USER"
    echo ""
    
    log_info "テーブル一覧:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt" 2>/dev/null || log_warning "テーブル情報を取得できません"
    echo ""
    
    log_info "ビュー一覧:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dv" 2>/dev/null || log_warning "ビュー情報を取得できません"
}

# メイン処理
case "$1" in
    --test-connection)
        test_connection
        ;;
    --create-db)
        test_connection && create_database
        ;;
    --drop-db)
        test_connection && drop_database
        ;;
    --apply-schema)
        test_connection && apply_schema
        ;;
    --reset-db)
        test_connection && reset_database
        ;;
    --info)
        test_connection && show_database_info
        ;;
    "")
        # 引数なしの場合は標準セットアップ
        log_info "標準セットアップを開始します"
        if test_connection; then
            if create_database; then
                apply_schema
                log_success "セットアップが完了しました！"
                echo ""
                show_database_info
            else
                log_info "既存のデータベースにスキーマを適用しますか？ (yes/no)"
                read -p "> " apply_confirm
                if [ "$apply_confirm" == "yes" ]; then
                    apply_schema
                fi
            fi
        fi
        ;;
    *)
        log_error "不明なオプション: $1"
        echo "ヘルプを表示するには --help を使用してください"
        exit 1
        ;;
esac

log_info "完了"
